import logo from '../logo.svg';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './login';

function App() {
  return (
  
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> {/* Default Route */}
        <Route path="/Login" element={<Login />} />
        {/* Add other routes here */}
      </Routes>
    </Router>
  );
}

export default App;
