import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Alert, Spin, Typography, Space, Modal, message } from 'antd';
import { ExclamationCircleOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { getAvailableModels, generateNewPredictions } from '../../../services/riskPredictionService';
import PropTypes from 'prop-types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * Component that prompts users to create new predictions when no CSV data is found
 * Allows users to select a model and trigger prediction generation
 */
const CreatePredictionPrompt = ({ onPredictionComplete, visible = true }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customDataDir, setCustomDataDir] = useState('');

  // Load available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const availableModels = await getAvailableModels();
        setModels(availableModels);
        // Select the first model by default
        if (availableModels.length > 0) {
          setSelectedModel(availableModels[0].id);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load available models');
      } finally {
        setModelsLoading(false);
      }
    };

    if (visible) {
      fetchModels();
    }
  }, [visible]);

  const handleGeneratePredictions = async () => {
    if (!selectedModel) {
      message.error('Please select a model first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateNewPredictions(
        selectedModel,
        customDataDir.trim() || null
      );

      message.success(`Successfully generated ${result.predictions_count || 'new'} predictions!`);
      
      // Call the callback to refresh the parent component
      if (onPredictionComplete) {
        onPredictionComplete(result);
      }
    } catch (err) {
      console.error('Error generating predictions:', err);
      setError(err.message || 'Failed to generate predictions');
      message.error('Failed to generate predictions');
    } finally {
      setLoading(false);
    }
  };

  const confirmGeneration = () => {
    Modal.confirm({
      title: 'Generate New Predictions',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            This will generate new risk predictions using the selected model and current student data.
          </Paragraph>
          <Paragraph>
            <strong>Selected Model:</strong> {models.find(m => m.id === selectedModel)?.name}
          </Paragraph>
          {customDataDir && (
            <Paragraph>
              <strong>Custom Data Directory:</strong> {customDataDir}
            </Paragraph>
          )}
          <Paragraph style={{ color: '#666' }}>
            This process may take a few minutes depending on the amount of data.
          </Paragraph>
        </div>
      ),
      onOk: handleGeneratePredictions,
      okText: 'Generate Predictions',
      cancelText: 'Cancel',
      okButtonProps: { loading }
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Card 
      style={{ 
        maxWidth: 600, 
        margin: '20px auto',
        textAlign: 'center'
      }}
      cover={
        <div style={{ padding: '40px 20px 20px', backgroundColor: '#fafafa' }}>
          <RocketOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3} style={{ margin: 0 }}>
            No Risk Predictions Available
          </Title>
        </div>
      }
    >
      <div style={{ padding: '0 20px 20px' }}>
        <Paragraph style={{ fontSize: 16, marginBottom: 24 }}>
          No CSV prediction data was found. Generate new risk predictions to see at-risk students analysis.
          Make sure you have the data in the /data in csv formant (Should be the same data uploaded to the firestore)
        </Paragraph>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {modelsLoading ? (
            <Spin tip="Loading available models..." />
          ) : (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Select Prediction Model:
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Choose a model for predictions"
                value={selectedModel}
                onChange={setSelectedModel}
                size="large"
              >
                {models.map(model => (
                  <Option key={model.id} value={model.id}>
                    <div>
                      <strong>{model.name}</strong>
                      {model.description && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {model.description}
                        </div>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ padding: 0 }}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>

          {showAdvanced && (
            <div style={{ textAlign: 'left' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Custom Data Directory (Optional):
              </Text>
              <input
                type="text"
                placeholder="e.g., /path/to/custom/data"
                value={customDataDir}
                onChange={(e) => setCustomDataDir(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Leave empty to use default data directory
              </Text>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={!selectedModel || modelsLoading}
            onClick={confirmGeneration}
            style={{ minWidth: 200 }}
          >
            Generate New Predictions
          </Button>
        </Space>

        <Paragraph style={{ marginTop: 24, color: '#666', fontSize: 14 }}>
          This will analyze current student data and generate risk predictions using machine learning.
        </Paragraph>
      </div>
    </Card>
  );
};

CreatePredictionPrompt.propTypes = {
  onPredictionComplete: PropTypes.func,
  visible: PropTypes.bool
};

export default CreatePredictionPrompt;
