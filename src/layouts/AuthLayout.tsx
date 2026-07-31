import { Outlet } from 'react-router-dom'

/**
 * Layout de autenticación: pantalla dividida con branding a la izquierda
 * y formulario a la derecha. Mobile-first: solo formulario en móvil.
 */
export default function AuthLayout() {
  return (
    <Outlet />
  )
}
