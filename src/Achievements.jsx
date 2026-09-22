import { useState } from 'react'
import { supabase } from './supabaseClient'
import { achievementGroups, isValidDate, normalizeText } from './reporting'

function Achievements({ students, achievements, setAchievements, disabled }) {
  const [studentId, setStudentId] = useState('')
  const [selectedGoals, setSelectedGoals] = useState([])
  const [otherGoal, setOtherGoal] = useState('')
  const [date, setDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const studentAchievements = achievements
    .filter((achievement) => achievement.student_id === studentId)
    .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))
  const selectedStudent = students.find((student) => student.id === studentId)

  function alreadyAchieved(category, goal) {
    return studentAchievements.some((achievement) => achievement.category === category &&
      normalizeText(achievement.goal) === normalizeText(goal))
  }

  function toggleGoal(goal, checked) {
    setSelectedGoals((current) => checked ? [...current, goal] : current.filter((item) => item !== goal))
  }

  async function recordAchievements(event) {
    event.preventDefault()
    if (isSaving || disabled) return
    setMessage(null)

    if (!selectedStudent || !isValidDate(date)) {
      setMessage({ type: 'error', text: 'Choose a student and provide a valid date attained.' })
      return
    }

    const records = []
    for (const group of achievementGroups) {
      for (const goal of group.goals) {
        if (selectedGoals.includes(goal) && !alreadyAchieved(group.category, goal)) {
          records.push({ student_id: studentId, category: group.category, goal, achieved_at: date })
        }
      }
    }
    if (otherGoal.trim()) {
      if (alreadyAchieved('Other', otherGoal)) {
        setMessage({ type: 'error', text: 'This Other achievement is already recorded. Clear or change it before saving.' })
        return
      }
      records.push({ student_id: studentId, category: 'Other', goal: otherGoal.trim(), achieved_at: date })
    }
    if (records.length === 0) {
      setMessage({ type: 'error', text: 'Check at least one new achievement or enter an Other achievement.' })
      return
    }

    setIsSaving(true)
    try {
      // One insert saves the entire batch together; a database error rejects it all.
      const { data, error } = await supabase.from('achievements').insert(records).select()
      if (error || !data || data.length !== records.length) throw error || new Error('Missing saved achievements')

      setAchievements((current) => [...current, ...data])
      setSelectedGoals([])
      setOtherGoal('')
      setMessage({ type: 'success', text: `${data.length} achievement${data.length === 1 ? '' : 's'} saved. History is updated below.` })
    } catch (error) {
      setMessage({ type: 'error', text: error?.code === '23505'
        ? 'An achievement in this selection is already recorded. No new records were added by this attempt. Refresh to load the latest history before retrying.'
        : 'Could not confirm the saved achievements. Your selections are kept. Refresh to check before retrying.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="card" aria-labelledby="achievement-heading">
      <h2 id="achievement-heading">Record Achievements</h2>
      <p className="section-description">Check each goal when attained. Labels and asterisks follow the LVAEP form.</p>
      <form onSubmit={recordAchievements}>
        <fieldset disabled={disabled || isSaving}>
          <legend className="sr-only">Achievement details</legend>
          <label htmlFor="achievement-student">Student</label>
          <select id="achievement-student" value={studentId} required onChange={(event) => {
            setStudentId(event.target.value)
            setSelectedGoals([])
            setOtherGoal('')
            setMessage(null)
          }}>
            <option value="">{students.length === 0 ? 'No students added yet' : 'Select a student'}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <label htmlFor="achievement-date">Date attained</label>
          <input id="achievement-date" type="date" value={date} required onChange={(event) => setDate(event.target.value)} />

          {achievementGroups.map((group) => (
            <fieldset key={group.category} className="achievement-group" disabled={!studentId}>
              <legend>{group.heading}</legend>
              {group.goals.map((goal) => {
                const attained = alreadyAchieved(group.category, goal)
                return (
                  <label key={goal} className={`achievement-option${attained ? ' attained' : ''}`}>
                    <input type="checkbox" checked={attained || selectedGoals.includes(goal)} disabled={attained}
                      onChange={(event) => toggleGoal(goal, event.target.checked)} />
                    <span>{goal}{attained && <small>Already attained</small>}</span>
                  </label>
                )
              })}
            </fieldset>
          ))}
          <fieldset className="achievement-group" disabled={!studentId}>
            <legend>E. Other(s):</legend>
            <label htmlFor="achievement-other">Other achievement (optional)</label>
            <input id="achievement-other" value={otherGoal} maxLength="1000"
              onChange={(event) => setOtherGoal(event.target.value)} />
          </fieldset>
          <button type="submit">{isSaving ? 'Saving…' : 'Save Achievements'}</button>
        </fieldset>
      </form>
      {message && <p className={`message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}

      <div className="history-section">
        <h3>Achievement History{selectedStudent ? ` · ${selectedStudent.name}` : ''}</h3>
        {!studentId ? <p className="empty-state">{students.length === 0 ? 'Add a student first to start recording achievements.' : 'Select a student above to see their achievements.'}</p> :
          studentAchievements.length === 0 ? <p className="empty-state">No achievements recorded for this student yet. Check a goal above when attained.</p> : (
            <ul className="record-list">
              {studentAchievements.map((achievement) => (
                <li key={achievement.id}>
                  <div className="record-heading"><strong>{achievement.category === 'Other' ? 'Other(s)' : achievement.category}</strong><time dateTime={achievement.achieved_at}>{achievement.achieved_at}</time></div>
                  <p>{achievement.goal}</p>
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  )
}

export default Achievements
