import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import Carousel from "./Carousel"; 
import Card from "./Card"; 
import styles from "../styles/modules/Dashboard.module.css";
import { useLanguage } from "../contexts/LanguageContext"; 

const Dashboard = () => {
  const profilePicUrl = "https://cdn-icons-png.flaticon.com/512/8847/8847419.png";
  const { students, courseData, loading, error } = useData();
  const { t } = useLanguage(); 

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
    <div className={styles.dashboardContainer}>
      <h1 className={styles.title}>{t("general", "welcome")}</h1>

      <h2 className={styles.sectionTitle}>{t("menu", "courses")}</h2>
      <Carousel items={coursesCarousel} />

      <h2 className={styles.sectionTitle}>{t("menu", "students")}</h2>
      <Carousel items={studentsCarousel} />
    </div>
  );
};

export default React.memo(Dashboard);