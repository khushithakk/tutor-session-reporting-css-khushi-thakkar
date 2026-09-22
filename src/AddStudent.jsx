import { useState } from 'react'
import { supabase } from './supabaseClient'
import { normalizeText } from './reporting'

function AddStudent({ students, setStudents, disabled }) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function addStudent(event) {
    event.preventDefault()
    if (disabled || isSaving) return
    setMessage(null)
    const trimmedName = name.trim()

    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Enter a student name.' })
      return
    }
    if (students.some((student) => normalizeText(student.name) === normalizeText(trimmedName))) {
      setMessage({ type: 'error', text: 'A student with that name already exists. Choose them in the forms below.' })
      return
    }

    setIsSaving(true)
    try {
      const { data, error } = await supabase.from('students')
        .insert({ name: trimmedName }).select().single()
      if (error || !data) throw error || new Error('Missing saved student')

      setStudents((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setMessage({ type: 'success', text: `${data.name} added. You can select this student in both forms below.` })
    } catch (error) {
      setMessage({ type: 'error', text: error?.code === '23505'
        ? 'A student with that name already exists. Refresh to load the latest roster.'
        : 'Could not confirm the saved student. Your entry is kept. Refresh to check before retrying.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="card" aria-labelledby="add-student-heading">
      <h2 id="add-student-heading">Add New Student</h2>
      <p className="section-description">Add a fictional student before recording sessions or achievements.</p>
      <form onSubmit={addStudent}>
        <fieldset disabled={disabled || isSaving} className="add-student-form">
          <legend className="sr-only">New student details</legend>
          <div>
            <label htmlFor="new-student-name">Student name</label>
            <input id="new-student-name" value={name} required maxLength="120"
              onChange={(event) => setName(event.target.value)} />
          </div>
          <button type="submit">{isSaving ? 'Adding…' : 'Add Student'}</button>
        </fieldset>
      </form>
      {message && <p className={`message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  )
}

export default AddStudent
