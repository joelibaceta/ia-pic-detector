# Ensemble Model v4 Results

## Training Parameters
- Dataset: archive/real_vs_fake/real-vs-fake
- Train per class: 10,000 samples
- Valid per class: 5,000 samples
- Features: 59 possible → 52 selected (post-ablation)

## Model Architecture
- **Ensemble**: 50% Random Forest + 30% Logistic + 20% Neural Net
- **ROC Optimization**: Threshold selected via ROC curve analysis
- **Confidence Penalty**: 15% reduction for predictions near threshold
- **Random Forest**: 220 trees, max depth 8, min samples split 24

## Validation Performance (10k samples)
| Metric | Value |
|--------|-------|
| F1 Score | 0.6522 |
| Precision | 0.6400 |
| Recall | 0.6648 |
| Balanced Accuracy | 0.6455 |
| TP | 3324 |
| TN | 3131 |
| FP | 1869 |
| FN | 1676 |

## Comparison vs Baseline
- Baseline (pixel.v3.rf.10k): F1 = 0.7059 ✓ BEST
- Ensemble v4: F1 = 0.6522 (-7.6%)
- **Tradeoff**: Better recall (+1.1% vs baseline), lower precision (-2.6%)

## New Features Added
1. **Color Histogram** (3 features)
   - `col_hist_entropy`: Detects uniform AI colors
   - `col_hist_uniformity`: Color distribution uniformity
   - `col_hist_spread`: Color palette spread

2. **Illumination Consistency** (2 features)
   - `illum_consistency`: Region brightness variance
   - `illum_uniformity`: Uniformity score (AI indicator)

3. **Edge Uniformity** (3 features)
   - `edge_uniformity`: Edge magnitude distribution
   - `edge_sharpness`: Edge contrast
   - `edge_density`: Edge pixel ratio

## Implementation Details
- Model version: 3.1.0-feature-engineered-ensemble
- ROC points: Calculated for all unique score thresholds
- Ensemble voting: Weighted average of model probabilities
- Fallback: Individual model if ensemble data unavailable

## Recommendation
For production with current dataset:
- **Best F1**: Keep `hybrid-model.fe.pixel.v3.rf.10k.json`
- **For recall priority**: Use `hybrid-model.fe.ensemble.v4.10k.json`
- **Next step**: Consider ensemble weight tuning or feature re-selection

## Files
- Model: `hybrid-model.fe.ensemble.v4.10k.json` (11MB)
- Report: `feature-engineering-report.ensemble.v4.10k.json` (22KB)
- Commit: ensemble voting + ROC + 3 spatial feature extractors
