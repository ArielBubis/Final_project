import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Row, Col, Divider, Alert } from 'antd';
import { createTeacher, updateTeacher } from '../../../services/adminService';
import styles from '../../../styles/modules/AdminDashboard.module.css';

const { Option } = Select;

const TeacherForm = ({ teacher, isEditing, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set form fields when teacher data changes (for editing)
  useEffect(() => {
    if (isEditing && teacher) {
      form.setFieldsValue({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        gender: teacher.gender,
        department: teacher.department,
        title: teacher.title,
        schoolId: teacher.schoolId
      });
    } else {
      form.resetFields();
    }
  }, [form, teacher, isEditing]);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (isEditing) {
        // Update existing teacher
        result = await updateTeacher(teacher.id, values);
        onSubmit(result);
      } else {
        // Create new teacher
        result = await createTeacher(values);
        onSubmit(values, result?.tempPassword);
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
      setError(`Failed to ${isEditing ? 'update' : 'create'} teacher: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.teacherForm}>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gender: '',
          department: '',
          title: '',
          schoolId: ''
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'Please enter the first name' }]}
            >
              <Input placeholder="Enter first name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter the last name' }]}
            >
              <Input placeholder="Enter last name" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter the email address' },
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
          disabled={isEditing} // Can't edit email of existing teacher
        >
          <Input placeholder="Enter email address" disabled={isEditing} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="gender"
              label="Gender"
            >
              <Select placeholder="Select gender">
                <Option value="male">Male</Option>
                <Option value="female">Female</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="title"
              label="Title"
            >
              <Input placeholder="e.g., Professor, Dr., Mr., Ms." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="department"
              label="Department"
            >
              <Input placeholder="e.g., Science, Math, History" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="schoolId"
              label="School ID"
            >
              <Input placeholder="Enter school identifier" />
            </Form.Item>
          </Col>
        </Row>

        {!isEditing && (
          <Alert
            message="Important Information"
            description="When you create a new teacher account, a temporary password will be generated. The system will automatically send a password reset email to the teacher. You will also receive the temporary password after submission which you can securely share with the teacher."
            type="info"
            showIcon
            style={{ marginBottom: 16, marginTop: 16 }}
          />
        )}

        <Divider />

        <div className={styles.formActions}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            style={{ marginLeft: 8 }}
          >
            {isEditing ? 'Update Teacher' : 'Create Teacher'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default TeacherForm;