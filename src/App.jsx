import './App.css'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const[student, setStudent] = useState('')
  const[date, setDate] = useState('')
  const[hours, setHours] = useState('')
  const[sessions, setSessions] = useState([])
  const[selectedMonth, setSelectedMonth] = useState('')
  const[selectedYear, setSelectedYear] = useState('')
  const[isLoading, setIsLoading] = useState(true)
  const[loadError, setLoadError] = useState('')

  useEffect(() => {
    async function fetchSessions() {
      try {
        const {data, error} = await supabase
          .from('sessions')
          .select('*')

        if (error) {
          throw error
        }
        setSessions(data ?? [])
      } catch {
        setLoadError('Could not load sessions. Please refresh the page to try again.')
      } finally {
        setIsLoading(false)
      }

    }
    fetchSessions()
  }, [])

  async function recordSession() {

    if (student === '' || date === '' || hours === '') {
      alert('Please fill out every field!')
      return
    }

    if (!Number.isFinite(Number(hours)) || Number(hours) < 0) {
      alert('Please enter a valid number of hours, zero or greater.')
      return
    }

    const newSession = {
      student: student,
      date: date,
      hours: hours
    }

    try {
      const {data, error} = await supabase
        .from('sessions')
        .insert([newSession])
        .select()

      if (error || !data?.[0]) {
        alert('Could not confirm the saved session. Your entries have been kept. Refresh to check before trying again.')
        return
      }

      setSessions((currentSessions) => [...currentSessions, data[0]])
      setStudent('')
      setDate('')
      setHours('')
    } catch {
      alert('Could not confirm the saved session. Your entries have been kept. Refresh to check before trying again.')
    }
  }

  // Exclude incomplete or invalid records so the report stays usable.
  const validSessions = sessions.filter((session) => {
    if (!session || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
      return false
    }

    const parsedDate = new Date(`${session.date}T00:00:00Z`)
    const validDate = !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === session.date
    const validHours = session.hours !== null &&
      String(session.hours).trim() !== '' &&
      Number.isFinite(Number(session.hours)) && Number(session.hours) >= 0

    return validDate && validHours
  })

  const filteredSessions = validSessions.filter((session) => {
    // Dates are stored as YYYY-MM-DD, so no timezone conversion is needed.
    const [sessionYear, sessionMonth] = session.date.split('-')
    const matchesMonth = selectedMonth === '' || sessionMonth === selectedMonth
    const matchesYear = selectedYear === '' || sessionYear === selectedYear

    return matchesMonth && matchesYear
  })

  const totalHours = filteredSessions.reduce((total, session) => {
    return total + Number(session.hours)
  }, 0)

  const availableYears = [...new Set(
    validSessions.map((session) => session.date.split('-')[0])
  )].sort()

  return (
    <div>
      <h1>Tutor Session Reporting</h1>
      <p>Record and manage monthly tutoring sessions.</p>
    
      <div>
        <h2>Record a Session</h2>
      </div>
      <div> 
        <h2>Session History</h2>
        <label htmlFor="report-month">View Month</label>
        <select
          id="report-month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          <option value="">All Months</option>
          <option value="01">January</option>
          <option value="02">February</option>
          <option value="03">March</option>
          <option value="04">April</option>
          <option value="05">May</option>
          <option value="06">June</option>
          <option value="07">July</option>
          <option value="08">August</option>
          <option value="09">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>

        <label htmlFor="report-year">View Year</label>
        <select
          id="report-year"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
        >
          <option value="">All Years</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {isLoading && <p>Loading sessions...</p>}
        {loadError && <p role="alert">{loadError}</p>}

        {!isLoading && !loadError && (
          <>
            {validSessions.length < sessions.length && (
              <p>Some sessions have invalid dates or hours and are excluded from this report.</p>
            )}

            <p>Total tutoring hours for selected period: {totalHours}</p>

            {filteredSessions.length === 0 && (
              <p>No valid sessions found for the selected period. Try another month or year, or record a session.</p>
            )}

            {filteredSessions.map((session) => (
              <p key={session.id}>
                {session.student} - {session.date} - {session.hours} hours
              </p>
            ))}
          </>
        )}
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
