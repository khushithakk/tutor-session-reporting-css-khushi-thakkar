import './App.css'
import { useState } from 'react'
function App() {
  const[student, setStudent] = useState('')
  const[date, setDate] = useState('')
  const[hours, setHours] = useState('')
  const[sessions, setSessions] = useState([])

  function recordSession() {

    if (student === '' || date === '' || hours === '') {
      alert('Please fill out every field!')
      return
    }

    const newSession = {
      student: student,
      date: date,
      hours: hours
    }
    setSessions([...sessions, newSession])
    setStudent('')
    setDate('')
    setHours('')
  }


  return (
    <div>
      <h1>Tutor Session Reporting</h1>
      <p>Record and manage monthly tutoring sessions.</p>
    
      <div>
        <h2>Record a Session</h2>
      </div>
      <div> 
        <h2>Session History</h2>

        {sessions.map((session, index) => (
          <p key={index}>
            {session.student} - {session.date} - {session.hours} hours
          </p>
        ))}
      </div>
      <label>Student</label>

      <select
        value={student}
        onChange={(event) => setStudent(event.target.value)}
      >
        <option value="">Select a student</option>
        <option>Alex Johnson</option>
        <option>Maya Patel</option>
        <option>Jordan Smith</option>
      </select>

    <p>You selected: {student}</p>

      <label>Date</label>
      <input 
        type="date" 
        value={date}
        onChange={(event) => setDate(event.target.value)}
      />

      <label>Hours</label>
      <input 
        type="number" 
        step="0.25" 
        min="0" 
        value={hours}
        onChange={(event) => setHours(event.target.value)}
      />

      <button onClick={recordSession}>Record Session</button>

    </div>
  )
}

export default App