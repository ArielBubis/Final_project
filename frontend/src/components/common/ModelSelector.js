import React, { useState, useEffect } from 'react';
import { Select, Card, Alert, Spin, Typography, Descriptions, Tag } from 'antd';
import { getAvailableModels, setCurrentModel } from '../../services/riskPredictionService';

const { Option } = Select;
const { Title, Text } = Typography;

const ModelSelector = ({ onModelChange, disabled = false }) => {
  const [models, setModels] = useState([]);
  const [currentModelId, setCurrentModelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const availableModels = await getAvailableModels();
      setModels(availableModels);
      
      // Find current model
      const current = availableModels.find(model => model.is_current);
      if (current) {
        setCurrentModelId(current.id);
      } else if (availableModels.length > 0) {
        setCurrentModelId(availableModels[0].id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load available models');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (newModelId) => {
    if (newModelId === currentModelId) return;
    
    try {
      setUpdating(true);
      await setCurrentModel(newModelId);
      setCurrentModelId(newModelId);
      
      // Update models to reflect the change
      const updatedModels = models.map(model => ({
        ...model,
        is_current: model.id === newModelId
      }));
      setModels(updatedModels);
      
      // Notify parent component
      if (onModelChange) {
        const selectedModel = models.find(model => model.id === newModelId);
        onModelChange(selectedModel);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error changing model:', err);
      setError('Failed to switch model');
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentModel = () => {
    return models.find(model => model.id === currentModelId);
  };

  const currentModel = getCurrentModel();

  if (loading) {
    return (
      <Card title="Model Selection" size="small">
        <Spin tip="Loading available models..." />
      </Card>
    );
  }

  return (
    <Card title="Risk Prediction Model" size="small">
      {error && (
        <Alert 
          message="Error" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
      )}
      
      <div style={{ marginBottom: 16 }}>
        <Text strong>Select Model: </Text>
        <Select
          value={currentModelId}
          onChange={handleModelChange}
          loading={updating}
          disabled={disabled || updating}
          style={{ width: '100%', marginTop: 8 }}
          placeholder="Select a prediction model"
        >
          {models.map(model => (
            <Option key={model.id} value={model.id}>
              <div>
                <Text strong>{model.name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {model.description}
                </Text>
              </div>
            </Option>
          ))}
        </Select>
      </div>

      {currentModel && (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Model Name">
            {currentModel.name}
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {currentModel.description}
          </Descriptions.Item>
          <Descriptions.Item label="Data Required">
            <Tag color="blue">{currentModel.months_required} months</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Features">
            {currentModel.feature_count || 'Unknown'} features
          </Descriptions.Item>
        </Descriptions>
      )}
      
      {updating && (
        <Alert 
          message="Switching model..." 
          type="info" 
          showIcon 
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default ModelSelector;