using Compunet.YoloSharp;
using Compunet.YoloSharp.Data;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace AvatarSideClassifierWeb.Services;

public class AvatarClassifierService : IDisposable
{
    private readonly ILogger<AvatarClassifierService> _logger;
    private readonly NameMappingService _mapping;
    private readonly Lazy<YoloPredictor> _predictor;

    public AvatarClassifierService(IWebHostEnvironment env, ILogger<AvatarClassifierService> logger, NameMappingService mapping)
    {
        _logger = logger;
        _mapping = mapping;

        var modelPath = Path.Combine(env.ContentRootPath, "Assets", "Model", "Common", "avatar_side_classify_sim.onnx");
        _predictor = new Lazy<YoloPredictor>(() =>
        {
            if (!File.Exists(modelPath))
            {
                throw new FileNotFoundException("模型文件缺失，请将 avatar_side_classify_sim.onnx 放到 Assets/Model/Common/", modelPath);
            }

            var so = new Microsoft.ML.OnnxRuntime.SessionOptions();
            // Keep it CPU by default for portability; advanced users can tweak here
            so.AppendExecutionProvider_CPU();
            return new YoloPredictor(modelPath, new YoloPredictorOptions { SessionOptions = so });
        });
    }

    public async Task<object> ClassifyAsync(Stream imageStream)
    {
        using var img = await Image.LoadAsync<Rgb24>(imageStream);

        var result = _predictor.Value.Classify(img);
        var top = result.GetTopClass();

        // Match original logic: relax threshold for Qin/Costume
        bool isRelax = top.Name.Name.StartsWith("Qin", StringComparison.Ordinal) || top.Name.Name.Contains("Costume");
        double threshold = isRelax ? 0.51 : 0.7;
        if (top.Confidence < threshold)
        {
            return new
            {
                success = false,
                message = $"置信度过低: {top.Confidence:F2}, 识别结果: {top.Name.Name}",
                predicted = top.Name.Name,
                confidence = top.Confidence
            };
        }

        var (cn, costumeCn) = _mapping.Map(top.Name.Name);
        return new
        {
            success = true,
            predicted = top.Name.Name,
            confidence = top.Confidence,
            nameCn = cn,
            costumeCn,
            display = string.IsNullOrEmpty(costumeCn) ? cn : $"{cn}({costumeCn})"
        };
    }

    // 整屏截图 -> 按固定区域裁剪侧栏四个头像并分别识别
    public async Task<object> ClassifyTeamAsync(Stream imageStream)
    {
        using var full = await Image.LoadAsync<Rgb24>(imageStream);

        // 参考 1920x1080 下的四个侧栏头像矩形（与原 AutoFightAssets 中 AvatarSideIconRectList 一致）
        // 然后按比例缩放到当前图片尺寸。
        var baseW = 1920f;
        var baseH = 1080f;
        var scaleX = full.Width / baseW;
        var scaleY = full.Height / baseH;

        // 右侧栏四个头像（x,y,w,h）
        var rects = new (int x, int y, int w, int h)[]
        {
            // new Rect(CaptureRect.Width - 155, 225, 76, 76) 等价：x=1920-155=1765
            (1765, 225, 76, 76),
            (1765, 315, 76, 76),
            (1765, 410, 76, 76),
            (1765, 500, 76, 76),
        };

        var outputs = new List<object>(4);
        for (int i = 0; i < rects.Length; i++)
        {
            var (rx, ry, rw, rh) = rects[i];
            // 按比例缩放
            var sx = (int)Math.Round(rx * scaleX);
            var sy = (int)Math.Round(ry * scaleY);
            var sw = (int)Math.Round(rw * scaleX);
            var sh = (int)Math.Round(rh * scaleY);

            // 边界裁剪
            sx = Math.Clamp(sx, 0, Math.Max(0, full.Width - 1));
            sy = Math.Clamp(sy, 0, Math.Max(0, full.Height - 1));
            if (sx + sw > full.Width) sw = full.Width - sx;
            if (sy + sh > full.Height) sh = full.Height - sy;
            if (sw <= 1 || sh <= 1)
            {
                outputs.Add(new { index = i + 1, success = false, message = "裁剪区域无效" });
                continue;
            }

            using var cropped = full.Clone(ctx => ctx.Crop(new Rectangle(sx, sy, sw, sh)));
            var result = _predictor.Value.Classify(cropped);
            var top = result.GetTopClass();

            bool isRelax = top.Name.Name.StartsWith("Qin", StringComparison.Ordinal) || top.Name.Name.Contains("Costume");
            double threshold = isRelax ? 0.51 : 0.7;
            if (top.Confidence < threshold)
            {
                outputs.Add(new
                {
                    index = i + 1,
                    success = false,
                    message = $"置信度过低: {top.Confidence:F2}，结果: {top.Name.Name}",
                    predicted = top.Name.Name,
                    confidence = top.Confidence
                });
                continue;
            }

            var (cn, costumeCn) = _mapping.Map(top.Name.Name);
            outputs.Add(new
            {
                index = i + 1,
                success = true,
                predicted = top.Name.Name,
                confidence = top.Confidence,
                nameCn = cn,
                costumeCn,
                display = string.IsNullOrEmpty(costumeCn) ? cn : $"{cn}({costumeCn})"
            });
        }

        return new { mode = "team", count = outputs.Count, results = outputs };
    }

    public void Dispose()
    {
        if (_predictor.IsValueCreated)
        {
            _predictor.Value.Dispose();
        }
    }
}
