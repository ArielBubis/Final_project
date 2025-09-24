// Feature flags configuration
// Loads configuration from shared config.json file

import configData from './config.json';

export const FEATURE_FLAGS = {
    // Multi-model selection feature for ML risk prediction
    ENABLE_MULTI_MODEL: configData.features?.ENABLE_MULTI_MODEL ?? false,
};

export default FEATURE_FLAGS;