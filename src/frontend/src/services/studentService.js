import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export const fetchAllStudents = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        const students = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return students;
    } catch (error) {
        console.error("Error fetching students:", error);
        throw error;
    }
};
