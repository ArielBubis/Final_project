import React, { useEffect, useState } from "react";
import { fetchAllStudents } from "../services/studentService";
import Carousel from "./Carousel"; // Import the Carousel component
import Card from "./Card"; // Import the Card component
import "./Dashboard.css";
import "./Card.css"; // Import the Card CSS for styling

const Dashboard = () => {
  const profilePicUrl = "https://cdn-icons-png.flaticon.com/512/8847/8847419.png";
  const [studentData, setStudentData] = useState([]);

  const courseData = [ // cousrses demo data
    { name: "Math 101", level: "Beginner", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "History 202", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Physics 303", level: "Advanced", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Calculus 1", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" }
  ];

  // const studentData = [ // students demo data
  //   { name: "John Doe", age: 20, profileUrl: profilePicUrl },
  //   { name: "Jane Smith", age: 22, profileUrl: profilePicUrl },
  //   { name: "Alice Johnson", age: 19, profileUrl: profilePicUrl },
  //   { name: "Bob Brown", age: 21, profileUrl: profilePicUrl }
  // ]

  useEffect(() => {
    const getStudents = async () => {
      try {
        const students = await fetchAllStudents();
        setStudentData(students);
      } catch (error) {
        console.error("Failed to load students:", error.message);
      }
    };
    getStudents();
  }, []);

  const coursesCarousel = courseData.map((course, idx) => (
    <Card key={idx} data={course} imageKey="thumbnailUrl" size="md" type="course" />
  ));

  const studentsCarousel = studentData.map((student, idx) => (
    <Card
      key={idx}
      data={{
        name: student.studentName,
        level: student.level
      }}
      imageKey={profilePicUrl}
      size="sm"
      type="student"
    />));

  return (
    <div className="dashboard-container">
      <h1 >Welcome to the ClassInsight</h1>

      <h2 style={{ marginTop: '-2px' }}>Courses</h2>
      <Carousel items={coursesCarousel} />

      <h2 style={{ paddingTop: "5px" }}>Students</h2>
      <Carousel items={studentsCarousel} />
    </div>
  );
};

export default Dashboard;
