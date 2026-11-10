import { cn } from '@/lib/utils'
import { ArrowLeft, BackpackIcon, CircleChevronLeft } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

type THeading = {
    title: string
    description?: string
    classNameTitle?: string
    classNameDesc?: string
    className?: string
    back?: boolean
}

const TitleHeading = ({ title, description, classNameDesc, classNameTitle, className, back }: THeading) => {
    const navigate = useNavigate()
    return (
        <div className={cn("flex items-center", className)}>
            {
                back && (
                    <div className='h-12 w-12 p-2' onClick={() => navigate(-1)}>
                        <ArrowLeft className='w-full h-full cursor-pointer' />
                    </div>
                )
            }

            <div>
                <h1 className={cn('text-xl font-bold', classNameTitle)}>{title}</h1>
                <p className={cn('mt-0.5 text-sm text-muted-foreground', classNameDesc)}>{description}</p>
            </div>
        </div>
    )
}

export default TitleHeading