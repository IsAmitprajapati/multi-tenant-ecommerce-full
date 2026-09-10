import { cn } from '@/lib/utils'
import React from 'react'

type THeading = {
    title: string
    description?: string
    classNameTitle?: string
    classNameDesc?: string
    className?: string
}

const TitleHeading = ({ title, description, classNameDesc, classNameTitle, className }: THeading) => {
    return (
        <div className={cn(className)}>
            <h1 className={cn('text-xl font-bold', classNameTitle)}>{title}</h1>
            <p className={cn('mt-0.5 text-sm text-muted-foreground', classNameDesc)}>{description}</p>
        </div>
    )
}

export default TitleHeading