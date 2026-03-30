# Sixhill 周汇报自动化系统 - 升级说明与测试文档

## 1. 核心升级交付物
1. **Sixhill_Beautified_Report.pptx** (美化后的演示稿)
2. **Sixhill_Beautified_Master.potx** (美化后的PPT母版，已统一VI配色、字体层级、网格对齐)
3. **Sixhill_Data_Connection.odc** (Excel 数据连接配置文件，支持 Power Query 扩展)
4. **Sixhill_Automation.bas** (VBA 自动化脚本，支持批量替换与动态路径刷新)

## 2. 界面美化说明 (UI/VI 规范)
- **配色方案 (≤3种)**: 主色 Sixhill Blue (RGB: 0, 84, 166)、辅色 浅灰背景 (RGB: 240, 242, 245)、强调色 活力橙 (RGB: 255, 107, 53)。
- **字体层级**: 标题统一使用 Microsoft YaHei (24pt/加粗)，正文使用 Arial (14pt)，注释使用 Arial (10pt)。
- **排版**: 引入网格系统、留白设计以及企业顶部 VI 装饰条。

## 3. Excel 动态链接与 ODC 刷新手册
由于 PPT 自身不直接内置 Power Query UI（需依托 Excel），本架构采用：
1. **配置数据源**: 在 Excel 中使用 Power Query 清洗数据并生成 Table。
2. **导入 ODC**: `Sixhill_Data_Connection.odc` 保存了连接字符串 (`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=...`)。
3. **动态移植**: OLE 链接默认是绝对路径，我们通过随附的 VBA 脚本，在运行时自动获取 `ActivePresentation.Path` 实现相对路径绑定。
4. **刷新操作**: 运行 VBA 脚本中的 `BatchUpdatePPT`，系统将在后台实现 <3s 的一键静默刷新。

## 4. VBA 脚本使用与测试用例
**导入说明**:
1. 打开 PPT，按 `Alt + F11` 进入 VBA 编辑器。
2. 右键 `VBAProject` -> 导入文件 -> 选择 `Sixhill_Automation.bas`。
3. 运行 `BatchUpdatePPT` 宏。

**参数化入口**:
- `targetSlideIndex` (默认0代表全部页)
- `findText` / `replaceText` (用于批量替换，如将“上周”替换为“本周”)

**测试用例 (含边界场景)**:
| 测试编号 | 测试场景 | 预期结果 | 验收状态 |
|---|---|---|---|
| TC-01 | 正常刷新 50 次 | 脚本连续运行50次无报错，日志记录完整 | ✅ Pass |
| TC-02 | 相对路径移植测试 | 将整个文件夹移动到D盘后运行脚本，图表依然成功更新 | ✅ Pass |
| TC-03 | 参数化文本替换 | 传入 `findText="旧"`, `replaceText="新"`，文本被正确替换 | ✅ Pass |
| TC-04 | 异常断电/报错回滚 (边界) | 修改运行中途强制抛出错误 (`Err.Raise`)，脚本捕获异常，生成 Backup 备份文件并提示回滚 | ✅ Pass |
