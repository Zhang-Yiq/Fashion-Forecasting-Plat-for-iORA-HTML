/**
 * AHP Decision Model for Fashion Forecasting Platform
 * Analytic Hierarchy Process (AHP) Implementation for MCDA
 * 
 * This module provides Multi-Criteria Decision Analysis functionality
 * for the AI sales forecasting system, enabling data-driven decisions
 * based on multiple weighted criteria.
 * 
 * Author: iORA Fashion Forecasting System
 * Date: 2026-01-07
 */

class AHPDecisionModel {
  /**
   * Initialize the AHP Decision Model
   * @param {string} modelName - Name of the decision model
   * @param {Array} alternatives - List of alternatives to evaluate
   * @param {Array} criteria - List of evaluation criteria
   */
  constructor(modelName, alternatives = [], criteria = []) {
    this.modelName = modelName;
    this.alternatives = alternatives;
    this.criteria = criteria;
    this.pairwiseComparisons = new Map();
    this.weights = new Map();
    this.scores = new Map();
    this.consistencyIndex = 0;
    this.consistencyRatio = 0;
    this.randomIndices = {
      1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45,
      10: 1.49, 11: 1.51, 12: 1.56, 13: 1.57, 14: 1.59, 15: 1.60
    };
  }

  /**
   * Add a criterion to the decision model
   * @param {string} criterionName - Name of the criterion
   * @param {object} config - Configuration for the criterion
   */
  addCriterion(criterionName, config = {}) {
    const criterion = {
      name: criterionName,
      description: config.description || '',
      type: config.type || 'benefit', // 'benefit' or 'cost'
      unit: config.unit || '',
      weight: 0
    };
    this.criteria.push(criterion);
    return criterion;
  }

  /**
   * Add an alternative to evaluate
   * @param {string} alternativeName - Name of the alternative
   * @param {object} data - Data associated with the alternative
   */
  addAlternative(alternativeName, data = {}) {
    const alternative = {
      name: alternativeName,
      data: data,
      scores: {}
    };
    this.alternatives.push(alternative);
    return alternative;
  }

  /**
   * Set pairwise comparison between two criteria
   * @param {string} criterion1 - First criterion name
   * @param {string} criterion2 - Second criterion name
   * @param {number} intensity - Comparison intensity (1-9 scale)
   */
  setPairwiseComparison(criterion1, criterion2, intensity) {
    const key = this._createComparisonKey(criterion1, criterion2);
    this.pairwiseComparisons.set(key, intensity);
    
    // Reciprocal relationship
    const reverseKey = this._createComparisonKey(criterion2, criterion1);
    this.pairwiseComparisons.set(reverseKey, 1 / intensity);
  }

  /**
   * Create a comparison matrix from pairwise comparisons
   * @returns {Array} Comparison matrix
   */
  _createComparisonMatrix() {
    const n = this.criteria.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        const key = this._createComparisonKey(
          this.criteria[i].name,
          this.criteria[j].name
        );
        const value = this.pairwiseComparisons.get(key) || 1;
        matrix[i][j] = value;
        matrix[j][i] = 1 / value;
      }
    }
    return matrix;
  }

  /**
   * Calculate criterion weights using eigenvalue method
   */
  calculateWeights() {
    const matrix = this._createComparisonMatrix();
    const n = matrix.length;

    // Calculate column sums
    const columnSums = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        columnSums[j] += matrix[i][j];
      }
    }

    // Normalize matrix
    const normalizedMatrix = matrix.map((row, i) =>
      row.map((val, j) => val / columnSums[j])
    );

    // Calculate weights as row averages
    const weights = normalizedMatrix.map((row) =>
      row.reduce((a, b) => a + b, 0) / n
    );

    // Store weights
    this.criteria.forEach((criterion, index) => {
      criterion.weight = weights[index];
      this.weights.set(criterion.name, weights[index]);
    });

    // Calculate consistency ratio
    this._calculateConsistency(matrix, weights);

    return weights;
  }

  /**
   * Calculate consistency index and ratio
   * @param {Array} matrix - Comparison matrix
   * @param {Array} weights - Calculated weights
   */
  _calculateConsistency(matrix, weights) {
    const n = matrix.length;
    
    // Calculate weighted sum
    const weightedSum = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        weightedSum[i] += matrix[i][j] * weights[j];
      }
    }

    // Calculate lambda max
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      lambdaMax += weightedSum[i] / weights[i];
    }
    lambdaMax /= n;

    // Calculate Consistency Index
    this.consistencyIndex = (lambdaMax - n) / (n - 1);

    // Calculate Consistency Ratio
    const randomIndex = this.randomIndices[n] || 0;
    this.consistencyRatio = randomIndex > 0 ? this.consistencyIndex / randomIndex : 0;

    return {
      lambdaMax,
      consistencyIndex: this.consistencyIndex,
      consistencyRatio: this.consistencyRatio,
      isConsistent: this.consistencyRatio <= 0.1
    };
  }

  /**
   * Score an alternative against a criterion
   * @param {string} alternativeName - Alternative name
   * @param {string} criterionName - Criterion name
   * @param {number} score - Score (0-100)
   */
  scoreAlternative(alternativeName, criterionName, score) {
    const alternative = this.alternatives.find(a => a.name === alternativeName);
    if (!alternative) throw new Error(`Alternative "${alternativeName}" not found`);

    if (!alternative.scores) alternative.scores = {};
    alternative.scores[criterionName] = Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall scores for all alternatives
   * @returns {Array} Ranked alternatives with scores
   */
  calculateOverallScores() {
    const results = this.alternatives.map((alternative) => {
      let overallScore = 0;

      this.criteria.forEach((criterion) => {
        const criterionScore = alternative.scores[criterion.name] || 0;
        overallScore += criterionScore * criterion.weight;
      });

      return {
        name: alternative.name,
        overallScore: overallScore.toFixed(2),
        details: {
          criteriaScores: alternative.scores,
          weights: Object.fromEntries(
            this.criteria.map(c => [c.name, c.weight.toFixed(4)])
          ),
          data: alternative.data
        }
      };
    });

    // Sort by overall score descending
    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Get sensitivity analysis for weight changes
   * @param {string} criterionName - Criterion to analyze
   * @param {number} delta - Change in weight (%)
   * @returns {Object} Sensitivity analysis results
   */
  sensitivityAnalysis(criterionName, delta = 0.05) {
    const originalWeights = new Map(this.weights);
    const results = [];

    // Test weight variations
    for (let variation = -delta; variation <= delta; variation += delta / 5) {
      const testWeights = new Map(this.weights);
      const currentWeight = testWeights.get(criterionName);
      testWeights.set(criterionName, Math.max(0, currentWeight + variation));

      // Normalize weights to sum to 1
      let sum = 0;
      testWeights.forEach(w => sum += w);
      testWeights.forEach((v, k) => testWeights.set(k, v / sum));

      // Calculate scores with modified weights
      const testScores = this.alternatives.map(alt => {
        let score = 0;
        this.criteria.forEach(criterion => {
          const altScore = alt.scores[criterion.name] || 0;
          score += altScore * testWeights.get(criterion.name);
        });
        return { name: alt.name, score };
      });

      results.push({
        variation: (variation * 100).toFixed(2) + '%',
        ranking: testScores.sort((a, b) => b.score - a.score).map(s => s.name)
      });
    }

    return {
      criterion: criterionName,
      originalWeight: originalWeights.get(criterionName).toFixed(4),
      sensitivityAnalysis: results
    };
  }

  /**
   * Export decision model to JSON format
   * @returns {Object} Model data
   */
  exportModel() {
    return {
      modelName: this.modelName,
      timestamp: new Date().toISOString(),
      criteria: this.criteria.map(c => ({
        name: c.name,
        description: c.description,
        type: c.type,
        weight: parseFloat(c.weight.toFixed(4))
      })),
      alternatives: this.alternatives.map(a => ({
        name: a.name,
        scores: a.scores,
        data: a.data
      })),
      consistency: {
        consistencyIndex: this.consistencyIndex.toFixed(4),
        consistencyRatio: this.consistencyRatio.toFixed(4),
        isConsistent: this.consistencyRatio <= 0.1
      },
      rankings: this.calculateOverallScores()
    };
  }

  /**
   * Import model from JSON format
   * @param {Object} modelData - Model data to import
   */
  importModel(modelData) {
    this.modelName = modelData.modelName;
    this.criteria = modelData.criteria;
    this.alternatives = modelData.alternatives;
    this.consistencyIndex = parseFloat(modelData.consistency.consistencyIndex);
    this.consistencyRatio = parseFloat(modelData.consistency.consistencyRatio);
  }

  /**
   * Create comparison key for pairwise comparisons
   * @private
   */
  _createComparisonKey(name1, name2) {
    return `${name1}|${name2}`;
  }

  /**
   * Generate comprehensive report
   * @returns {string} Formatted report
   */
  generateReport() {
    const scores = this.calculateOverallScores();
    let report = `\n${'='.repeat(60)}\n`;
    report += `AHP Decision Analysis Report: ${this.modelName}\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `${'='.repeat(60)}\n\n`;

    // Consistency Information
    report += `Consistency Check:\n`;
    report += `  Consistency Ratio: ${(this.consistencyRatio * 100).toFixed(2)}%\n`;
    report += `  Status: ${this.consistencyRatio <= 0.1 ? 'PASS ✓' : 'FAIL ✗'}\n\n`;

    // Criteria Weights
    report += `Criterion Weights:\n`;
    this.criteria.forEach((criterion) => {
      report += `  ${criterion.name}: ${(criterion.weight * 100).toFixed(2)}%\n`;
    });
    report += '\n';

    // Rankings
    report += `Rankings:\n`;
    scores.forEach((score, index) => {
      report += `  ${index + 1}. ${score.name}: ${score.overallScore}/100\n`;
    });
    report += `${'='.repeat(60)}\n`;

    return report;
  }
}

/**
 * Fashion Forecasting Context - Pre-configured AHP Models
 */
class FashionForecastingAHP {
  /**
   * Create an AHP model for sales forecast evaluation
   * @returns {AHPDecisionModel} Configured AHP model
   */
  static createSalesForecastModel() {
    const model = new AHPDecisionModel('Fashion Sales Forecast Evaluation');

    // Add criteria for sales forecasting
    model.addCriterion('Demand Accuracy', {
      description: 'Accuracy of demand predictions',
      type: 'benefit',
      unit: '%'
    });
    model.addCriterion('Trend Alignment', {
      description: 'Alignment with fashion trends',
      type: 'benefit',
      unit: 'score'
    });
    model.addCriterion('Seasonal Fit', {
      description: 'Seasonal appropriateness',
      type: 'benefit',
      unit: 'score'
    });
    model.addCriterion('Price Competitiveness', {
      description: 'Price positioning',
      type: 'benefit',
      unit: 'score'
    });
    model.addCriterion('Inventory Risk', {
      description: 'Stock management risk',
      type: 'cost',
      unit: 'score'
    });

    return model;
  }

  /**
   * Create an AHP model for product selection
   * @returns {AHPDecisionModel} Configured AHP model
   */
  static createProductSelectionModel() {
    const model = new AHPDecisionModel('Fashion Product Selection');

    model.addCriterion('Customer Demand', {
      description: 'Expected customer interest',
      type: 'benefit'
    });
    model.addCriterion('Profit Margin', {
      description: 'Expected profitability',
      type: 'benefit'
    });
    model.addCriterion('Supply Chain Risk', {
      description: 'Supply chain complexity',
      type: 'cost'
    });
    model.addCriterion('Brand Alignment', {
      description: 'Brand value alignment',
      type: 'benefit'
    });

    return model;
  }

  /**
   * Create an AHP model for supplier evaluation
   * @returns {AHPDecisionModel} Configured AHP model
   */
  static createSupplierEvaluationModel() {
    const model = new AHPDecisionModel('Fashion Supplier Evaluation');

    model.addCriterion('Quality', {
      description: 'Product quality standards',
      type: 'benefit'
    });
    model.addCriterion('Delivery Time', {
      description: 'Lead time reliability',
      type: 'benefit'
    });
    model.addCriterion('Cost', {
      description: 'Unit pricing',
      type: 'cost'
    });
    model.addCriterion('Sustainability', {
      description: 'Environmental practices',
      type: 'benefit'
    });

    return model;
  }
}

// Export for use in Node.js or browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AHPDecisionModel, FashionForecastingAHP };
}
