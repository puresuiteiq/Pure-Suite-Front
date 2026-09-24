import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon'

/**
 * One navigation row, shared by the Super Admin rail and the merchant rail so
 * their hover and active states can't drift apart.
 *
 * Hover nudges the row toward the reading edge, lifts the icon, and previews
 * the active rail at low opacity — so pointing at a row hints at where you'd
 * land before you commit.
 *
 * Everything directional is expressed with logical properties (`ps-`, `start-`)
 * rather than `translate-x`: the nudge has to travel the opposite way in
 * Arabic, and a physical transform would push it the wrong way. The reduced-
 * motion block in index.css already neutralises every CSS transition, so this
 * needs no motion guard of its own.
 */
export default function SidebarNavLink({ to, end, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color,padding-inline-start] duration-300 ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:ps-4 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`absolute inset-y-1.5 start-0 w-1 rounded-full bg-brand-600 transition-opacity duration-300 ${
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
            }`}
          />
          <Icon
            name={icon}
            className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  )
}
