import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useReadyCatalog } from '../../data/useCatalog'
import { getCity, getObject, getSystem, objectsForCity, systemsForCity } from '../../domain/queries'
import type { TaskPriority } from '../../domain/types'
import { taskPriorityLabel, taskStatusLabel, taskStatusOrder } from '../../shared/labels'
import { EmptyState } from '../../shared/ui/Status'
import controls from '../../shared/ui/controls.module.css'
import styles from './TasksPage.module.css'

export function TasksPage() {
  const { snapshot, tasks, addTask } = useReadyCatalog()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [cityId, setCityId] = useState('')
  const [objectId, setObjectId] = useState('')
  const [systemId, setSystemId] = useState('')
  const [message, setMessage] = useState<string | undefined>()

  const objects = cityId ? objectsForCity(snapshot, cityId) : snapshot.objects
  const systems = cityId ? systemsForCity(snapshot, cityId) : snapshot.systems

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const error = addTask({
      title,
      description,
      priority,
      cityId,
      objectId,
      systemId,
    })
    setMessage(error)
    if (!error) {
      setTitle('')
      setDescription('')
      setObjectId('')
      setSystemId('')
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>Tasks</h1>
        <p className={controls.muted}>
          Seed tasks come from the catalog. Tasks you add here stay in this browser session and disappear on reload.
        </p>
      </header>
      <form className={styles.form} onSubmit={onSubmit}>
        <label className={controls.stack}>
          Title
          <input className={controls.field} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className={controls.stack}>
          Priority
          <select className={controls.select} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className={controls.stack}>
          Description
          <textarea className={controls.area} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className={controls.stack}>
          <label className={controls.stack}>
            City
            <select className={controls.select} value={cityId} onChange={(event) => { setCityId(event.target.value); setObjectId(''); setSystemId('') }}>
              <option value="">None</option>
              {snapshot.cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </label>
          <label className={controls.stack}>
            Object
            <select className={controls.select} value={objectId} onChange={(event) => setObjectId(event.target.value)}>
              <option value="">None</option>
              {objects.map((object) => (
                <option key={object.id} value={object.id}>{object.name}</option>
              ))}
            </select>
          </label>
          <label className={controls.stack}>
            System
            <select className={controls.select} value={systemId} onChange={(event) => setSystemId(event.target.value)}>
              <option value="">None</option>
              {systems.map((system) => (
                <option key={system.id} value={system.id}>{system.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={controls.row}>
          <button className={controls.button} type="submit">Add task</button>
          {message ? <span className={controls.error}>{message}</span> : null}
        </div>
      </form>
      {tasks.length === 0 ? <EmptyState title="No tasks" /> : null}
      <div className={styles.board}>
        {taskStatusOrder.map((status) => (
          <section key={status} className={styles.column} aria-label={taskStatusLabel[status]}>
            <h2>{taskStatusLabel[status]}</h2>
            {tasks.filter((task) => task.status === status).map((task) => {
              const city = task.cityId ? getCity(snapshot, task.cityId) : undefined
              const object = task.objectId ? getObject(snapshot, task.objectId) : undefined
              const system = task.systemId ? getSystem(snapshot, task.systemId) : undefined
              return (
                <article key={task.id} className={styles.card}>
                  <strong>{task.title}</strong>
                  <span className={controls.muted}>{taskPriorityLabel[task.priority]}</span>
                  {task.description ? <p>{task.description}</p> : null}
                  <div className={controls.row}>
                    {city ? <Link to={`/cities/${city.id}`}>{city.name}</Link> : null}
                    {object && city ? <Link to={`/cities/${city.id}/objects/${object.id}`}>{object.name}</Link> : null}
                    {system && city ? <Link to={`/cities/${city.id}/systems/${system.id}`}>{system.name}</Link> : null}
                  </div>
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
