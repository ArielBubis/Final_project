import React from 'react';
import { Card as AntCard, Row, Col, Statistic, Progress, Alert, Table } from 'antd';
import styles from '../../../styles/modules/Students.module.css';

const CoursePerformanceCard = ({ course }) => {
  return (
    <AntCard key={course?.id} title={course?.courseName || "Unnamed Course"} className={styles.courseCard}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Statistic
            title="Overall Score"
            value={`${Math.round(course?.summary?.overallScore || 0)}%`}
            valueStyle={{ color: (course?.summary?.overallScore || 0) > 70 ? '#3f8600' : ((course?.summary?.overallScore || 0) > 50 ? '#faad14' : '#cf1322') }}
          />
        </Col>
        <Col xs={24} md={8}>
          <Statistic
            title="Completion Rate"
            value={`${Math.round(course?.summary?.overallCompletion || 0)}%`}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={24} md={8}>          <Statistic
            title="Last Accessed"
            value={course?.summary?.lastAccessed ? 
              (typeof course.summary.lastAccessed.toDate === 'function' 
                ? new Date(course.summary.lastAccessed.toDate()).toLocaleDateString() 
                : typeof course.summary.lastAccessed === 'string' 
                  ? new Date(course.summary.lastAccessed).toLocaleDateString()
                  : 'Never') 
              : 'Never'}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
      </Row>
      
      <h3>Module Progress</h3>
      <Row gutter={[16, 16]}>
        {Array.isArray(course.modules) && course.modules.length > 0 ? (
          course.modules.map((module) => (
            <Col xs={24} md={8} key={module?.id || Math.random()}>
              <AntCard title={module?.moduleTitle || "Unnamed Module"} size="small">
                <Progress 
                  percent={Math.round((module?.progress?.completion || 0))} 
                  status={(module?.progress?.completion || 0) === 100 ? "success" : "active"}
                />
                <p><strong>Expertise Rate:</strong> {Math.round((module?.progress?.totalExpertiseRate || 0))}%</p>                <p><strong>Last Accessed:</strong> {
                  (module?.progress?.lastAccessed) ? 
                    (typeof module.progress.lastAccessed.toDate === 'function'
                      ? new Date(module.progress.lastAccessed.toDate()).toLocaleDateString()
                      : typeof module.progress.lastAccessed === 'string'
                        ? new Date(module.progress.lastAccessed).toLocaleDateString()
                        : 'Never')
                    : 'Never'
                }</p>
              </AntCard>
            </Col>
          ))
        ) : (
          <Col span={24}>
            <Alert message="No module data available" type="info" />
          </Col>
        )}
      </Row>
      
      <h3>Assignment Progress</h3>
      {Array.isArray(course.assignments) && course.assignments.length > 0 ? (
        <Table
          dataSource={course.assignments.map(a => ({...a, key: a?.id || Math.random()}))}
          columns={[
            {
              title: 'Assignment',
              dataIndex: 'title',
              key: 'title',
              render: (text) => text || 'Unnamed Assignment'
            },
            {
              title: 'Score',
              dataIndex: 'progress',
              key: 'score',
              render: (progress) => progress?.totalScore ? `${Math.round(progress.totalScore)}%` : 'Not submitted'
            },
            {
              title: 'Submitted',
              dataIndex: 'progress',
              key: 'submitted',              render: (progress) => {
                try {
                  if (!progress?.submittedAt) {
                    return 'Not submitted';
                  }
                  
                  if (typeof progress.submittedAt.toDate === 'function') {
                    return new Date(progress.submittedAt.toDate()).toLocaleDateString();
                  } else if (typeof progress.submittedAt === 'string') {
                    return new Date(progress.submittedAt).toLocaleDateString();
                  } else if (progress.submittedAt instanceof Date) {
                    return progress.submittedAt.toLocaleDateString();
                  } else {
                    return 'Date format error';
                  }
                } catch (e) {
                  console.error('Error rendering submission date:', e, progress);
                  return 'Date error';
                }
              }
            },
            {
              title: 'Time Spent',
              dataIndex: 'progress',
              key: 'time',
              render: (progress) => progress?.totalTime ? `${Math.round(progress.totalTime / 60)} minutes` : 'N/A'
            }
          ]}
          pagination={false}
          size="small"
        />
      ) : (
        <Alert message="No assignment data available" type="info" />
      )}
    </AntCard>
  );
};

export default CoursePerformanceCard;
