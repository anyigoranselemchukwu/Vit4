# VIT NETWORK — UPDATED ROADMAP & DEBUGGING GUIDE

**Last Updated**: April 19, 2026, 12:30 PM  
**Phase**: A (Stabilization) - 85% Complete  
**Next Milestone**: May 2, 2026 (Phase A 100%)  
**ML Training Progress**: 2/12 models complete

---

## 🗺️ UPDATED TIMELINE

### Week 1 (Apr 21-27) - Phase A Completion Sprint

```
Monday (TODAY):
  ✅ CI/CD pipeline implemented (187 lines)
  ✅ 2 ML models trained (Logistic Regression, Random Forest)
  ✅ Test lines: 1,739 → 2,866 (+1,127 lines)
  ✅ Test coverage: 20% → 30-35%
  ✅ 3 blockers fixed
  
Tuesday (Apr 22):
  ⏳ Train XGBoost model (3-4 hours)
  ⏳ Train Poisson Regression (2-3 hours)
  ⏳ Connect 2-3 frontend pages (4 hours)
  ⏳ Increase test coverage to 35% (2 hours)
  
Wednesday (Apr 23):
  ⏳ Train LSTM model (4-6 hours)
  ⏳ Train Transformer model (4-6 hours)
  ⏳ Security audit (3-4 hours)
  
Thursday-Friday (Apr 24-25):
  ⏳ Train remaining 3-4 models (8-12 hours)
  ⏳ Connect remaining frontend pages (2-3 hours)
  ⏳ Phase A completion checklist (3-4 hours)
  ⏳ Documentation (2-3 hours)

DEADLINE: Friday, April 28, 2026 ✅

Phase A Status: 85% → 100% COMPLETE
Phase B Status: 0% → 25% (ML models)
```

### Week 2 (Apr 28 - May 4) - Phase A Final + Phase B Ramp

```
Monday (Apr 28):
  ⏳ Test coverage: 35% → 40%
  ⏳ Measure model accuracy (all trained models)
  ⏳ Fix any CI/CD issues
  
Tuesday-Wednesday (Apr 29-30):
  ⏳ Test coverage: 40% → 50%
  ⏳ Load testing (100 concurrent users)
  ⏳ Performance optimization
  
Thursday (May 1):
  ⏳ Final Phase A verification
  ⏳ All blockers resolved
  ⏳ Documentation complete
  
Friday (May 2):
  ✅ PHASE A GO/NO-GO DECISION
  ✅ Phase B kickoff
  ✅ 50%+ test coverage verified

MILESTONE: Phase A 100% Complete, Phase B 25% Done
```

### Weeks 3-4 (May 5-18) - Phase B Completion

```
Phase B (ML Training):
  Week 1: Finish training all 12 models
  Week 2: Validate accuracy, optimize weights
  
Deliverables:
  - All 12 models trained and validated
  - Edge detection working
  - Ensemble integration complete
  - Real predictions in API

TIMELINE: May 5 → May 18 (2 weeks)
```

---

## 🐛 DEBUGGING GUIDE

### Issue 1: Model Training Not Working

**Symptoms**:
- `models/` directory empty
- Models not in CI/CD logs
- Predictions still returning noise

**Debug Steps**:

```bash
# Step 1: Check if training script exists
ls -la scripts/train_models.py

# Step 2: Run training manually
python scripts/train_models.py --model logistic
# Should output: "Training Logistic Regression..."
# Should create: models/logistic_v1.pkl

# Step 3: Verify model file exists
ls -lh models/*.pkl
# Should show: logistic_v1.pkl, rf_v1.pkl

# Step 4: Test model loading
python -c "import joblib; m = joblib.load('models/logistic_v1.pkl'); print('Model loaded:', type(m))"

# Step 5: Check model accuracy
python scripts/validate_models.py
# Should output accuracy scores for each model
```

**Common Fixes**:
```python
# If "Model not found" error:
# Check: scripts/train_models.py
# Ensure it saves to: models/{name}_v1.pkl
# Ensure joblib import is correct

# If "Out of Memory":
# Reduce training data size
# Use sample of 5,000 matches instead of all
# Set: LSTM_MAX_TRAINING_SEQS=1000

# If "ImportError: No module named 'sklearn'":
pip install scikit-learn==1.6.1
```

### Issue 2: Tests Failing Locally

**Symptoms**:
- `pytest tests/` shows failures
- GitHub Actions fails
- Coverage report incorrect

**Debug Steps**:

```bash
# Step 1: Run tests with verbose output
pytest tests/ -v --tb=short

# Step 2: Run specific test file
pytest tests/test_error_cases.py -v

# Step 3: Run with coverage
pytest tests/ --cov=app --cov-report=html

# Step 4: Check coverage details
# Open: htmlcov/index.html
# See which lines are NOT covered

# Step 5: Fix failing tests
# Edit the test file
# Re-run: pytest tests/test_specific.py -v
```

**Common Fixes**:
```python
# If "AttributeError: module has no attribute":
# Check: The module was imported correctly
# Ensure: Class/function exists in module

# If "AssertionError: assert X == Y":
# Debug: Print what actual value is
# Fix: Update test or code to match

# If "TimeoutError":
# Add: @pytest.mark.timeout(120)
# Or: pytest --timeout=120

# If "Database locked":
# Use: SQLite in-memory (test.db temporary)
# Or: Use PostgreSQL for testing
```

### Issue 3: CI/CD Pipeline Failing

**Symptoms**:
- GitHub Actions shows red X
- Tests won't run
- Merge blocked

**Debug Steps**:

```bash
# Step 1: Check GitHub Actions tab
# Go to: Your repo > Actions
# Click on failed run
# See detailed error logs

# Step 2: Understand the error
# Red text shows what failed
# Look for: "Error:", "Failed:", "AssertionError"

# Step 3: Fix locally first
# Run same command on your machine
# Fix until it works locally

# Step 4: Test on branch
git checkout -b fix/ci-issue
# Make fixes
git commit -m "Fix CI issue"
git push origin fix/ci-issue
# Watch GitHub Actions run again

# Step 5: If all pass, merge
# Create PR and merge to main
```

**Common Fixes**:
```yaml
# If "Python version mismatch":
# Edit: .github/workflows/ci.yml
# Change: PYTHON_VERSION: "3.12" → "3.11"

# If "Dependencies not installed":
# Check: requirements.txt has all packages
# Ensure: pip install -r requirements.txt works locally

# If "Coverage threshold not met":
# Edit: ci.yml line 63
# Change: --fail-under=30 → --fail-under=25 (temporary)
# Or: Add more tests to reach threshold

# If "Frontend build fails":
# Run: cd frontend && npm ci && npm run build
# Fix TypeScript errors locally first
```

### Issue 4: Frontend Not Connecting to API

**Symptoms**:
- Page shows "Loading..."  forever
- No data appears
- Network tab shows errors (404, 500)

**Debug Steps**:

```bash
# Step 1: Check API is running
curl http://localhost:8000/health
# Should return: {"status":"ok"}

# Step 2: Check API endpoint exists
curl http://localhost:8000/matches
# Should return: JSON array of matches

# Step 3: Check frontend is calling API
# Open: Browser DevTools (F12)
# Go to: Network tab
# Reload page
# See: Requests to http://localhost:8000/...

# Step 4: Check for CORS errors
# Look in: Console tab
# Error will say: "CORS: Cross-Origin Request Blocked"

# Step 5: Check API response
# Click on failed request
# See: Status code (200, 404, 500)
# See: Response body (error message)
```

**Common Fixes**:
```typescript
// If "API endpoint not found (404)":
// Check: Backend has the route defined
// Ensure: app.include_router(...) in main.py
// Verify: Route path matches frontend URL

// If "CORS error":
// Add to main.py:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporary for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

// If "500 Internal Server Error":
// Check: Backend logs
// Look for: Exception traceback
// Fix: The error in the route handler

// If "Token expired":
// Refresh: Call /auth/refresh endpoint
// Get: New token
// Retry: Original request
```

### Issue 5: Low Test Coverage

**Symptoms**:
- Coverage report shows <30%
- CI pipeline fails coverage check
- Don't know if code is tested

**Debug Steps**:

```bash
# Step 1: Generate coverage report
pytest tests/ --cov=app --cov-report=html

# Step 2: Open coverage report
open htmlcov/index.html  # Mac
# or: start htmlcov/index.html  # Windows
# or: xdg-open htmlcov/index.html  # Linux

# Step 3: Identify untested files
# Look for: Red lines (not covered)
# Click on file name
# See exactly which lines aren't tested

# Step 4: Write tests for untested code
# Create: tests/test_missing_coverage.py
# Add: Tests for red-line functions

# Step 5: Verify coverage increased
# Re-run: pytest --cov=app
# Check: Coverage went up
```

**Coverage Target By Date**:
```
Apr 21: 30% ✅
Apr 23: 35% (Tuesday)
Apr 25: 40% (Thursday)
Apr 28: 45% (Friday, Week 2)
May 2:  50%+ ✅ (GO TO PRODUCTION)
```

---

## 📋 SPECIFIC TASKS FOR THIS WEEK

### For Backend Developer

**Tuesday (Apr 22)**:
```bash
# Morning (4 hours):
python scripts/train_models.py --model xgboost
# Wait for completion (large model)

# Afternoon (3 hours):
python scripts/train_models.py --model poisson
# Or: python scripts/train_models.py --model poisson_regression

# Measure coverage:
pytest tests/ --cov=app --cov-report=term-missing
# Goal: See coverage increased to 35%

# Check models trained:
ls -lh models/
# Should show: logistic_v1.pkl, rf_v1.pkl, xgb_v1.pkl, poisson_v1.pkl
```

**Wednesday (Apr 23)**:
```bash
# Morning (6 hours):
python scripts/train_models.py --model lstm
# This will take time (neural network)
# Don't stop until completion

# Afternoon (2 hours):
# Write LSTM validation tests
# Create: tests/test_lstm_model.py
# Add: 3-5 tests validating LSTM predictions

# Evening:
pytest tests/ --cov=app
# Goal: Coverage at 37%+
```

**Thursday (Apr 24)**:
```bash
# Morning (6 hours):
python scripts/train_models.py --model transformer
# Another neural network, will take time

# Afternoon (4 hours):
# Train remaining 2-3 models:
# - Monte Carlo
# - Bayesian
# - Anomaly Detection
python scripts/train_models.py --model monte_carlo
python scripts/train_models.py --model bayesian

# Evening:
pytest tests/ --cov=app
# Goal: Coverage at 40%+
```

**Friday (Apr 25)**:
```bash
# Morning (4 hours):
# Complete any remaining models
python scripts/train_models.py --all
# Or train individually

# Afternoon (4 hours):
# Write validation tests for all models
pytest tests/test_ml_models.py -v
# Ensure all tests pass

# Final check:
ls models/*.pkl | wc -l
# Should show: 8-10 model files

# Coverage:
pytest tests/ --cov=app
# Goal: 40%+ achieved
```

### For Frontend Developer

**Tuesday (Apr 22)**:
```typescript
// Open: frontend/src/pages/predictions.tsx

// Replace this:
const matches = useMockMatches();

// With this:
import { api } from '@/lib/apiClient';
const { data: matches } = useQuery({
  queryKey: ['matches'],
  queryFn: () => api.get('/matches').then(r => r.data)
});

// Test:
npm run dev
// Visit: http://localhost:3000/predictions
// Should show: Real matches from API
```

**Wednesday (Apr 23)**:
```typescript
// Open: frontend/src/pages/analytics.tsx

// Replace mock data with:
const { data: stats } = useQuery({
  queryKey: ['analytics'],
  queryFn: () => api.get('/analytics').then(r => r.data)
});

// Test all pages connected:
// 1. Predictions ✅
// 2. Analytics ✅
// 3. Wallet (next)
// 4. Admin (next)
```

**Thursday (Apr 24)**:
```typescript
// Open: frontend/src/pages/wallet.tsx
// Connect to: /api/wallet/me

// Open: frontend/src/pages/admin.tsx
// Connect to: /api/admin/dashboard

// Test:
npm run dev
// Verify: All 4 pages show real data
```

**Friday (Apr 25)**:
```typescript
// Test all 17 pages load without errors
// Check: No broken links
// Verify: No 404 errors in network tab
// Ensure: All pages connected to API

// Run build:
npm run build
// Should complete without errors

// Check: dist/ folder created
ls -la frontend/dist/
```

### For DevOps / Tech Lead

**Tuesday (Apr 22)**:
```bash
# Morning (2 hours):
# Verify CI/CD is running
git log --oneline | head -5
# For each commit, check GitHub Actions

# Check coverage tracking:
# Go to: GitHub > Actions > Latest run
# See: Coverage report uploaded to Codecov

# Afternoon (2 hours):
# Update coverage threshold
# Edit: .github/workflows/ci.yml
# Line 63: --fail-under=35 (up from 30)

# Run security audit:
safety check -r requirements.txt
```

**Wednesday-Friday**:
```bash
# Daily:
# Check all CI runs passing
# Monitor coverage trend
# Ensure no regressions

# Friday:
# Generate final metrics
# Create summary for team
# Prepare Phase B kickoff
```

---

## ✅ CHECKLIST FOR PHASE A COMPLETION

### By Friday, April 28

**Code**:
- [ ] All 12 ML models trained (or 10+ at minimum)
- [ ] All models saved to `models/` directory
- [ ] Models integrated into API
- [ ] Real predictions returned by `/predict` endpoint
- [ ] Test coverage: 40%+ (verified)
- [ ] All tests passing (0 failures)
- [ ] CI/CD running successfully
- [ ] No security vulnerabilities (safety check)

**Frontend**:
- [ ] All 17 pages connected to real API
- [ ] No 404 errors in network tab
- [ ] No CORS errors in console
- [ ] Frontend builds without errors
- [ ] Frontend pages load data correctly

**Infrastructure**:
- [ ] GitHub Actions CI/CD working
- [ ] Coverage reports uploaded to Codecov
- [ ] Database migrations applied
- [ ] All environment variables set
- [ ] Health check endpoint responding

**Documentation**:
- [ ] Deployment guide written
- [ ] API documentation updated
- [ ] Development setup guide
- [ ] Troubleshooting guide
- [ ] README.md updated with current status

**Testing**:
- [ ] 40%+ code coverage
- [ ] 100+ tests passing
- [ ] All critical paths tested
- [ ] Error cases covered
- [ ] RBAC validated

---

## 📊 SUCCESS METRICS

### By Friday, April 25

```
✅ ML Models:
   2/12 Done (Logistic, Random Forest)
   
✅ Test Coverage:
   30-35% (up from 20%)
   
✅ CI/CD:
   100% Complete and working
   
✅ Frontend:
   80% Integrated (14/17 pages)
   
✅ Blockers Fixed:
   3/5 (CI/CD, Tests, Partial ML)
```

### By Friday, April 28

```
✅ ML Models:
   10-12/12 Done (all trained)
   
✅ Test Coverage:
   40%+ (doubled from start)
   
✅ Frontend:
   100% Integrated (all 17 pages)
   
✅ Blockers Fixed:
   4/5 (1 deferred to Phase F)
   
🎉 PHASE A: 100% COMPLETE
```

---

## 🚀 PHASE B PREVIEW (Weeks 3-4)

Once Phase A is done, immediately start:

1. **ML Model Validation** (Days 1-3)
   - Test accuracy of all 12 models
   - Validate >55% accuracy on recent matches
   - Compare to market odds

2. **Ensemble Optimization** (Days 4-7)
   - Fine-tune model weights
   - Test edge detection
   - Optimize for real predictions

3. **Performance Testing** (Days 8-10)
   - Load test with 100+ concurrent users
   - Measure latency (<500ms p99)
   - Database query optimization

4. **Final Integration** (Days 11-14)
   - All systems working together
   - Real predictions in production
   - Phase C preparation

---

## 📞 QUICK REFERENCE

### Daily Command Checklist

```bash
# Every morning:
git pull  # Get latest code
pytest tests/ -v --tb=short  # Run all tests
pytest tests/ --cov=app  # Check coverage

# Every afternoon:
git add .
git commit -m "Day X progress: [what you did]"
git push

# Every evening:
# Review GitHub Actions logs
# Check for any new failures
# Plan next day
```

### Files To Monitor

```
models/          # Should grow daily
  logistic_v1.pkl    ✅
  rf_v1.pkl          ✅
  xgb_v1.pkl         ⏳ (by Tue)
  poisson_v1.pkl     ⏳ (by Tue)
  lstm_v1.pkl        ⏳ (by Wed)
  transformer_v1.pkl ⏳ (by Wed)
  ... (more)

tests/           # Should grow daily
  2,866 lines ✅ (Monday)
  3,000 lines ⏳ (Wed)
  3,300 lines ⏳ (Fri)

.coverage        # Should improve daily
  30-35% ✅ (Monday)
  35-40% ⏳ (Wed)
  40%+ ⏳ (Friday)
```

---

## ✨ YOU'VE GOT THIS

**In 6 hours you've achieved**:
- ✅ CI/CD complete
- ✅ 2 ML models trained
- ✅ Tests increased 65%
- ✅ Fixed 3 blockers

**In next 7 days you can achieve**:
- ✅ 12 ML models trained
- ✅ 50%+ test coverage
- ✅ 100% Phase A complete
- ✅ Ready for Phase B

**Keep the momentum. Keep shipping. 🚀**

