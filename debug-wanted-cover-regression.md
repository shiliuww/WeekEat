# Debug Session: wanted-cover-regression
- **Status**: [OPEN]
- **Issue**: 用户输入想吃的食材或菜名后，周菜单没有稳定覆盖这些指定项；本地已有菜与需新补入菜都可能漏掉。
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-wanted-cover-regression.ndjson

## Reproduction Steps
1. 启动应用并进入“记录你的胃口偏好”。
2. 输入至少一个食材和一个菜名，例如“排骨”“南瓜”。
3. 生成一周菜谱，并检查结果中是否覆盖用户输入。
4. 对本地已有菜、库中不存在需 AI 新增的菜分别重复测试。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | 食材输入只参与偏好加权，没有进入“必须覆盖”集合，所以会被普通推荐逻辑稀释。 | High | Low | Pending |
| B | 本地匹配与 AI 补库完成后，缺少生成结果反向 cover 校验，导致部分指定项在最终排布或优化时丢失。 | High | Medium | Pending |
| C | AI 提示词虽然要求“必须出现”，但没有在失败时二次补齐或强化约束，因此多输入或混合输入场景不稳定。 | Medium | Medium | Pending |
| D | 用户指定项在 AI 优化或替换阶段缺少统一保护标记，部分条目在后处理时被换掉。 | Medium | Low | Pending |

## Log Evidence
Pending

## Verification Conclusion
Pending
