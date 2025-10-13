# AvatarSideClassifierWeb

独立于 BetterGI 的最小可用 Web API，用于“角色侧面头像 -> 名称”分类。

## 目录结构
- Assets/
  - combat_avatar.json：角色中英文映射（已内置）
  - Model/Common/avatar_side_classify_sim.onnx：头像分类模型（请自行放置）
- wwwroot/index.html：前端页面，上传图片并显示结果

## 运行
1. 放置模型文件：将 `avatar_side_classify_sim.onnx` 复制到
   `Assets/Model/Common/avatar_side_classify_sim.onnx`
2. 在此文件夹中使用 .NET 8 运行：
   - VS Code 调试或
   - 终端执行：`dotnet run`
3. 打开浏览器访问 `http://localhost:5000`（或控制台输出的端口），使用页面上传图片识别。

## API
- POST /api/classify
  - Content-Type: multipart/form-data
  - 字段：file（图片文件）
  - 返回：
    ```json
    {
      "success": true,
      "predicted": "QinCostumeFlamme",
      "confidence": 0.93,
      "nameCn": "琴",
      "costumeCn": "殷红终夜",
      "display": "琴(殷红终夜)"
    }
    ```
  - 当置信度过低：
    ```json
    { "success": false, "message": "...", "predicted": "...", "confidence": 0.42 }
    ```

## 依赖
- .NET 8
- NuGet: YoloSharp 6.0.3, Microsoft.ML.OnnxRuntime, SixLabors.ImageSharp

## 说明
- 本项目仅抽取“头像分类 -> 名称映射”最小功能，不依赖 BetterGI 的 DI、窗口绘制、分辨率判断等。
- 推理默认使用 CPU。如需 GPU/DML/ TensorRT，请在 `AvatarClassifierService` 中调整 SessionOptions。
- 图片请尽量裁剪为游戏右侧“角色头像侧面图标”的区域，以获得最佳效果。
