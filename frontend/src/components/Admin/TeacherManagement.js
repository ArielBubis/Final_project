import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Tag, 
  Space, 
  Popconfirm, 
  message, 
  Modal,
  Input, 
  Tooltip,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MailOutlined,
  UserOutlined,
  BookOutlined
} from '@ant-design/icons';
import { fetchAllTeachers, updateTeacher } from '../../services/adminService';
import TeacherForm from './TeacherForm';
import TeacherCourses from '../Courses/TeacherCourses';
import styles from '../../styles/modules/AdminDashboard.module.css';

const { Search } = Input;

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCoursesModalVisible, setIsCoursesModalVisible] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load teachers on component mount
  useEffect(() => {
    loadTeachers();
  }, []);

  // Function to load all teachers
  const loadTeachers = async () => {
    try {
      setLoading(true);
      const fetchedTeachers = await fetchAllTeachers();
      setTeachers(fetchedTeachers);
    } catch (error) {
      message.error('Failed to load teachers');
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new teacher
  const handleAddTeacher = () => {
    setCurrentTeacher(null);
    setIsEditing(false);
    setIsModalVisible(true);
  };

  // Handle editing an existing teacher
  const handleEditTeacher = (teacher) => {
    setCurrentTeacher(teacher);
    setIsEditing(true);
    setIsModalVisible(true);
  };

  // Handle viewing teacher's courses
  const handleViewCourses = (teacher) => {
    setCurrentTeacher(teacher);
    setIsCoursesModalVisible(true);
  };

  // Handle form submission (create/edit)
  const handleFormSubmit = async (teacherData, tempPassword) => {
    await loadTeachers(); // Reload teachers after submission
    setIsModalVisible(false);
    
    if (tempPassword) {
      Modal.success({
        title: 'Teacher Account Created',
        content: (
          <div>
            <p>Teacher account has been created successfully. A password reset email has been sent to the teacher.</p>
            <p><strong>Temporary password:</strong> {tempPassword}</p>
            <p>Please securely share this temporary password with the teacher.</p>
          </div>
        ),
      });
    } else {
      message.success(`Teacher ${isEditing ? 'updated' : 'created'} successfully`);
    }
  };

  // Handle search by teacher name or email
  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Table columns configuration
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          {record.firstName} {record.lastName}
        </span>
      ),
      sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <a href={`mailto:${email}`}>
          <MailOutlined style={{ marginRight: 8 }} />
          {email}
        </a>
      )
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => department || 'N/A',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title) => title || 'N/A',
    },
    {
      title: 'Courses',
      dataIndex: 'courseCount',
      key: 'courseCount',
      render: (courseCount, record) => (
        <Button 
          type="link" 
          onClick={() => handleViewCourses(record)}
          style={{ padding: 0 }}
        >
          <Badge count={courseCount} offset={[10, 0]}>
            <BookOutlined style={{ fontSize: 16 }} />
          </Badge>
          <span style={{ marginLeft: 8 }}>View Courses</span>
        </Button>
      ),
      sorter: (a, b) => a.courseCount - b.courseCount
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit teacher">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => handleEditTeacher(record)} 
              type="primary"
              size="small"
            />
          </Tooltip>
          <Tooltip title="Send password reset">
            <Button 
              icon={<MailOutlined />}
              size="small"
              onClick={() => message.info('Password reset feature coming soon')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.teacherManagement}>
      <div className={styles.tableHeader}>
        <div className={styles.tableTitle}>
          <h2>Teacher Management</h2>
          <p>Manage teacher accounts and their course assignments</p>
        </div>
        <div className={styles.tableActions}>
          <Search
            placeholder="Search teachers..."
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 250, marginRight: 16 }}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddTeacher}
          >
            Add Teacher
          </Button>
        </div>
      </div>

      <Table 
        dataSource={filteredTeachers} 
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
        scroll={{ x: true }}
      />

      {/* Teacher Form Modal */}
      <Modal
        title={isEditing ? "Edit Teacher" : "Add New Teacher"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <TeacherForm 
          teacher={currentTeacher} 
          isEditing={isEditing}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalVisible(false)}
        />
      </Modal>

      {/* Teacher Courses Modal */}
      <Modal
        title={`Courses for ${currentTeacher?.firstName} ${currentTeacher?.lastName}`}
        open={isCoursesModalVisible}
        onCancel={() => setIsCoursesModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsCoursesModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        <TeacherCourses teacher={currentTeacher} />
      </Modal>
    </div>
  );
};

export default TeacherManagement;