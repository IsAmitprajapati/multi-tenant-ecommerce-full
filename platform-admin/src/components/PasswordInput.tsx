import React, { useState } from 'react'
import type { InputGroup } from './ui/input-group'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

const PasswordInput = ({
    className,
    ...props
}:React.ComponentProps<typeof Input>) => {
    const [visible,setVisible] = useState<boolean>(false)

  return (
    <div className='relative'>
        <Input
            type={visible ? "text" : "password"}
            className={cn("pr-10",className)}
            {...props}
        />
        <button
            type='button'
            tabIndex={-1}
            onClick={()=>setVisible(preve => !preve)}
            aria-label={visible ? "Hide password" : "Show Password"}
            className='absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground'
        >
            {
                visible ? (
                    <EyeOff className='size-4'/>
                ) : (
                    <Eye className='size-4'/>
                )
            }
        </button>
    </div>
  )
}

export default PasswordInput