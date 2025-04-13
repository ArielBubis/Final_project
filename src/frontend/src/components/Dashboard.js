import React from "react";
import Carousel from "./Carousel"; // Import the Carousel component
import Card from "./Card"; // Import the Card component
import "./Dashboard.css";


const Dashboard = () => {
  // Sample data for carousel items (can be courses, students, etc.)
  const courseData = [
    { name: "Math 101", level: "Beginner", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "History 202", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Physics 303", level: "Advanced", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Calculus 1", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" }
  ];

  const carouselItems = courseData.map((course, idx) => (
    <Card key={idx} data={course} imageKey="thumbnailUrl" size="md" />
  ));

  return (
    <div className="dashboard-container">
 
        <h1>Welcome to the ClassInsight</h1>
        <p>Use the sidebar to navigate.</p>

        <h2>Courses</h2>
        <Carousel items={carouselItems} />
    </div>
  );
};

export default Dashboard;
