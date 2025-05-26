import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Statistic, Alert, Divider } from 'antd';

const FilteringTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sample data to test filtering logic
  const sampleCourses = [
    {
      id: 'course1',
      name: 'Course with 0 Score',
      summary: { overallScore: 0 },
      averageScore: 0
    },
    {
      id: 'course2',
      name: 'Course with Valid Score',
      summary: { overallScore: 75 },
      averageScore: 75
    },
    {
      id: 'course3',
      name: 'Course with No Summary',
      averageScore: 85
    },
    {
      id: 'course4',
      name: 'Course with Negative Score',
      summary: { overallScore: -5 },
      averageScore: -5
    },
    {
      id: 'course5',
      name: 'Another Valid Course',
      summary: { overallScore: 82 },
      averageScore: 82
    }
  ];

  const testFiltering = () => {
    setLoading(true);
    
    try {
      // Test CourseList filtering logic
      const courseListFiltered = sampleCourses.filter(course => {
        // Check if course has summary with overallScore
        if (course.summary && typeof course.summary.overallScore === 'number') {
          return course.summary.overallScore > 0;
        }
        // Check if course has averageScore (for course stats)
        if (typeof course.averageScore === 'number') {
          return course.averageScore > 0;
        }
        // If no score data, include the course
        return true;
      });

      // Test Student.js filtering logic (first part - score filtering)
      const studentCoursesFiltered = sampleCourses.filter(course => {
        // First filter out courses with 0 overall score
        const hasValidScore = course.summary && 
          typeof course.summary.overallScore === 'number' && 
          course.summary.overallScore > 0;
        
        return hasValidScore;
      });

      // Test useStudentData.js filtering logic
      const useStudentDataFiltered = sampleCourses.filter(course => 
        course && 
        course.summary && 
        typeof course.summary.overallScore === 'number' && 
        course.summary.overallScore > 0
      );

      setTestResults({
        original: sampleCourses,
        courseListFiltered,
        studentCoursesFiltered,
        useStudentDataFiltered,
        summary: {
          originalCount: sampleCourses.length,
          courseListCount: courseListFiltered.length,
          studentCoursesCount: studentCoursesFiltered.length,
          useStudentDataCount: useStudentDataFiltered.length
        }
      });
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    testFiltering();
  }, []);

  const columns = [
    {
      title: 'Course ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Course Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Overall Score',
      dataIndex: ['summary', 'overallScore'],
      key: 'overallScore',
      render: (score) => score !== undefined ? score : 'N/A'
    },
    {
      title: 'Average Score',
      dataIndex: 'averageScore',
      key: 'averageScore',
      render: (score) => score !== undefined ? score : 'N/A'
    }
  ];

  if (!testResults) {
    return <Card loading={loading}>Running filtering tests...</Card>;
  }

  if (testResults.error) {
    return (
      <Card title="Filtering Test Results">
        <Alert 
          message="Test Failed" 
          description={testResults.error} 
          type="error" 
          showIcon 
        />
      </Card>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <Card title="Course Filtering Test Results">
        <div style={{ marginBottom: 20 }}>
          <Statistic.Group>
            <Statistic title="Original Courses" value={testResults.summary.originalCount} />
            <Statistic title="CourseList Filtered" value={testResults.summary.courseListCount} />
            <Statistic title="Student.js Filtered" value={testResults.summary.studentCoursesCount} />
            <Statistic title="useStudentData Filtered" value={testResults.summary.useStudentDataCount} />
          </Statistic.Group>
        </div>

        <Alert 
          message="Test Summary" 
          description={`Successfully filtered out ${testResults.summary.originalCount - testResults.summary.courseListCount} courses with 0 or invalid scores`}
          type={testResults.summary.courseListCount === 2 ? "success" : "warning"}
          showIcon 
          style={{ marginBottom: 20 }}
        />

        <Divider>Original Courses</Divider>
        <Table 
          dataSource={testResults.original} 
          columns={columns} 
          rowKey="id" 
          size="small"
          pagination={false}
        />

        <Divider>Filtered Courses (CourseList Logic)</Divider>
        <Table 
          dataSource={testResults.courseListFiltered} 
          columns={columns} 
          rowKey="id" 
          size="small"
          pagination={false}
        />

        <Divider>Filtered Courses (Student.js Logic)</Divider>
        <Table 
          dataSource={testResults.studentCoursesFiltered} 
          columns={columns} 
          rowKey="id" 
          size="small"
          pagination={false}
        />

        <Divider>Filtered Courses (useStudentData Logic)</Divider>
        <Table 
          dataSource={testResults.useStudentDataFiltered} 
          columns={columns} 
          rowKey="id" 
          size="small"
          pagination={false}
        />

        <div style={{ marginTop: 20 }}>
          <Button type="primary" onClick={testFiltering} loading={loading}>
            Re-run Tests
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FilteringTest;
