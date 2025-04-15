import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import Carousel from "./Carousel"; 
import Card from "./Card"; 
import "../styles/styles.css";

const Dashboard = () => {
  const profilePicUrl = "https://cdn-icons-png.flaticon.com/512/8847/8847419.png";
  const { students, courseData, loading, error } = useData();

  const coursesCarousel = useMemo(() => 
    loading ? [] : courseData.map((course, idx) => (
      <Card key={idx} data={course} imageKey="thumbnailUrl" size="md" type="course" />
    )), [courseData, loading]);

  const studentsCarousel = useMemo(() => 
    loading ? [] : students.map((student, idx) => (
      <Card
        key={idx}
        data={{
          name: student.studentName,
          level: student.level
        }}
        imageKey={profilePicUrl}
        size="sm"
        type="student"
      />
    )), [students, profilePicUrl, loading]);

  if (loading) {
    return <div>Loading data...</div>;
  }

  if (error) {
    return <div>Error loading data: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Welcome to the ClassInsight</h1>

      <h2 style={{ marginTop: '-2px' }}>Courses</h2>
      <Carousel items={coursesCarousel} />

      <h2 style={{ paddingTop: "5px" }}>Students</h2>
      <Carousel items={studentsCarousel} />
    </div>
  );
};

export default React.memo(Dashboard);