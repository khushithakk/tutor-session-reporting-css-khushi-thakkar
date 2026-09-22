import './App.css'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Achievements from './Achievements'
import AddStudent from './AddStudent'
import { isValidDate, isValidSession } from './reporting'

const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Read the name through the foreign key, never from the legacy student column.
const sessionFields = 'id, student_id, date, hours, learner:students!student_id(id, name)'

function App() {
  const[studentId, setStudentId] = useState('')
  const[date, setDate] = useState('')
  const[hours, setHours] = useState('')
  const[sessions, setSessions] = useState([])
  const[selectedMonth, setSelectedMonth] = useState('')
  const[selectedYear, setSelectedYear] = useState('')
  const[isLoading, setIsLoading] = useState(true)
  const[loadError, setLoadError] = useState('')

  const [students, setStudents] = useState([])
  const [achievements, setAchievements] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [sessionMessage, setSessionMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchSessions() {
      try {
        const studentResult = await supabase.from('students').select('*').order('name')
        if (studentResult.error) throw studentResult.error
        const sessionResult = await supabase.from('sessions').select(sessionFields).order('date', { ascending: false })
        if (sessionResult.error) throw sessionResult.error
        const achievementResult = await supabase.from('achievements').select('*')
        if (achievementResult.error) throw achievementResult.error

        if (!cancelled) {
          setStudents(studentResult.data ?? [])
          setSessions(sessionResult.data ?? [])
          setAchievements(achievementResult.data ?? [])
        }
      } catch {
        if (!cancelled) setLoadError('Could not load reporting data. Check your connection and database setup, then refresh to try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }

    }
    fetchSessions()
    return () => { cancelled = true }
  }, [])

  async function recordSession(event) {
    event.preventDefault()
    if (isSaving || isLoading || loadError) return
    setSessionMessage(null)
    const numericHours = Number(hours)

    if (!students.some((student) => student.id === studentId) || !isValidDate(date) ||
        !hours.trim() || !Number.isFinite(numericHours) || numericHours <= 0) {
      setSessionMessage({ type: 'error', text: 'Select a student, enter a valid date, and enter hours greater than zero.' })
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await supabase.from('sessions').insert({
        student_id: studentId,
        date,
        hours: numericHours
      }).select(sessionFields).single()
      if (error || !data) throw error || new Error('Missing saved session')

      setSessions((currentSessions) => [...currentSessions, data])
      setStudentId('')
      setDate('')
      setHours('')
      setSessionMessage({ type: 'success', text: 'Session saved. The monthly report updates when the session matches your selected period.' })
    } catch {
      setSessionMessage({ type: 'error', text: 'Could not confirm the saved session. Your entries are kept. Refresh to check before retrying.' })
    } finally {
      setIsSaving(false)
    }
  }

  const validSessions = sessions.filter(isValidSession)

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

  const periodLabel = `${selectedMonth ? months[Number(selectedMonth) - 1] : 'All months'} · ${selectedYear || 'All years'}`
  const studentSummary = students.map((student) => {
    const studentSessions = filteredSessions.filter((session) => session.student_id === student.id)
    return {
      ...student,
      sessionCount: studentSessions.length,
      hours: studentSessions.reduce((total, session) => total + Number(session.hours), 0)
    }
  }).filter((student) => student.sessionCount > 0)
  const formsDisabled = isLoading || Boolean(loadError) || students.length === 0

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Literacy tutoring · Sample-data prototype</p>
        <h1>Tutor Session Reporting</h1>
        <p>Track tutoring time and celebrate student achievements.</p>
        <p className="prototype-note">Use fictional students and sample information only.</p>
      </header>

      {isLoading && <p className="message" role="status">Loading reporting data…</p>}
      {loadError && <p className="message error" role="alert">{loadError}</p>}
      {!isLoading && !loadError && students.length === 0 && (
        <p className="message">No students added yet. Use Add New Student below to get started.</p>
      )}

      <AddStudent students={students} setStudents={setStudents} disabled={isLoading || Boolean(loadError)} />

      <section className="card" aria-labelledby="report-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Dashboard</p><h2 id="report-heading">Monthly Report</h2></div>
          <p className="period-label">{periodLabel}</p>
        </div>
        <div className="filter-row">
          <div>
            <label htmlFor="report-month">View month</label>
            <select id="report-month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              <option value="">All Months</option>
              {months.map((month, index) => (
                <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-year">View year</label>
            <select id="report-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option value="">All Years</option>
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>
        {!isLoading && !loadError && (
          <>
            {validSessions.length < sessions.length && <p className="message">Some sessions have invalid dates or hours and are excluded from this report.</p>}
            <div className="report-totals">
              <div><strong>{Number(totalHours.toFixed(2))}</strong><span>Total tutoring hours</span></div>
              <div><strong>{filteredSessions.length}</strong><span>Sessions in selected period</span></div>
            </div>
            {studentSummary.length > 0 && (
              <div className="student-summary">
                <h3>Hours by student</h3>
                <ul>{studentSummary.map((student) => <li key={student.id}>{student.name} <strong>{Number(student.hours.toFixed(2))} hours</strong></li>)}</ul>
              </div>
            )}
            <div className="history-section">
              <h3>Session History</h3>
              {filteredSessions.length === 0 ? (
                <p className="empty-state">No sessions found for {periodLabel.toLowerCase()}. Try another period or record a session.</p>
              ) : (
                <ul className="record-list">
                  {[...filteredSessions].sort((a, b) => b.date.localeCompare(a.date)).map((session) => (
                    <li key={session.id} className="session-record">
                      <div><strong>{session.learner?.name || 'Student unavailable'}</strong><time dateTime={session.date}>{session.date}</time></div>
                      <span>{session.hours} hours</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>

      <div className="forms-grid">
        <section className="card" aria-labelledby="session-heading">
          <h2 id="session-heading">Record Session</h2>
          <p className="section-description">Add a student's tutoring attendance and time.</p>
          <form onSubmit={recordSession}>
            <fieldset disabled={formsDisabled || isSaving}>
              <legend className="sr-only">Session details</legend>
              <label htmlFor="session-student">Student</label>
              <select id="session-student" value={studentId} required onChange={(event) => setStudentId(event.target.value)}>
                <option value="">{students.length === 0 ? 'No students added yet' : 'Select a student'}</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              <label htmlFor="session-date">Session date</label>
              <input id="session-date" type="date" value={date} required onChange={(event) => setDate(event.target.value)} />
              <label htmlFor="session-hours">Tutoring hours</label>
              <input id="session-hours" type="number" step="0.25" min="0.25" value={hours} required
                aria-describedby="hours-help" onChange={(event) => setHours(event.target.value)} />
              <p id="hours-help" className="field-help">Enter time in quarter-hour increments, such as 1.25.</p>
              <button type="submit">{isSaving ? 'Saving…' : 'Save session'}</button>
            </fieldset>
          </form>
          {sessionMessage && <p className={`message ${sessionMessage.type}`} role={sessionMessage.type === 'error' ? 'alert' : 'status'}>{sessionMessage.text}</p>}
        </section>
        <Achievements students={students} achievements={achievements} setAchievements={setAchievements} disabled={formsDisabled} />
      </div>
      <footer>Sample-data prototype · Attendance and achievements are recorded separately.</footer>
    </main>
  )
}

export default App
