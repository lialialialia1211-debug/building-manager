# 大樓管理員

《大樓管理員》（設計暫名：《夜窗管理員》）是一款預計於 Steam 發行的單機成人向劇情推理／動態漫畫遊戲。

玩家扮演夜班大樓管理員，從三個隱藏對白的候選漫畫分鏡中逐格選擇，改變成年住戶的中間劇情。每條合法路線都有完整結局；特定選擇、角色狀態與跨房線索會揭露大樓謎團或解鎖自願親密內容。

## 目前狀態

本儲存庫目前是設計與驗證規劃階段，包含：

- [Steam 體驗版遊戲設計規格](docs/superpowers/specs/2026-07-16-night-window-manager-design.md)
- [Web 可玩原型實作計畫](docs/superpowers/plans/2026-07-16-night-window-manager-web-prototype.md)
- [AI 美術生產規格](docs/art/2026-07-16-web-prototype-art-production-spec.md)

尚未開始程式實作。

## 開發策略

1. 先使用 React／TypeScript 製作瀏覽器可玩原型。
2. 驗證選格樂趣、分支結構、重玩意願、介面與美術規格。
3. 核准玩法與內容後，再另行制定 Godot 移植計畫。

預定儲存庫結構：

```text
prototype-web/   Web 可玩原型
content/         引擎無關的故事 JSON 與資源清單
game-godot/      驗證通過後建立的正式遊戲
docs/            產品、實作、美術與測試文件
```
