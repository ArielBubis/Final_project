import React from "react";
import Carousel from "./Carousel"; // Import the Carousel component
import "./Dashboard.css";

const Dashboard = () => {
  // Sample data for carousel items (can be courses, students, etc.)
  const carouselItems = [
    <div>Course 1</div>,
    <div>Course 2</div>,
    <div>Course 3</div>,
    <div>Course 4</div>,
    <div>Course 5</div>
  ];

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <h1>Welcome to the Dashboard</h1>
        <p>Use the sidebar to navigate.</p>

        <h2>Our Courses</h2>
        <Carousel items={carouselItems} />
      </main>
    </div>
  );
};

export default Dashboard;
