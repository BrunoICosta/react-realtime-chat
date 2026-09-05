import type { PublicUser } from '@chat/shared'
import type { CSSProperties } from 'react'
import { initialsOf } from '../lib/initials'
import './Avatar.css'

interface AvatarProps {
  user: Pick<PublicUser, 'nickname' | 'color'>
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
}

export function Avatar({ user, size = 'md', online }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ '--avatar-color': user.color } as CSSProperties}
      aria-hidden="true"
    >
      {initialsOf(user.nickname)}
      {online && <span className="avatar__status" />}
    </span>
  )
}
