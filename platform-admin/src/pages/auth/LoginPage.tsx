import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAppDispatch, useAppSelector } from "@/hooks/use-store";
import { ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export default function LoginPage() {
    const dispatch = useAppDispatch()

    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = (e) => {
        e.preventDefault()

        setIsSubmitting(true)
        setTimeout(() => {
            setIsSubmitting(false)
            setPassword("")
            setEmail("")
        }, 2000);
    }


    return (
        <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
                Access the platform admin console.
            </p>

            <form className="mt-7" onSubmit={handleSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel
                            htmlFor="email"
                        >
                            Work Email
                        </FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@platform.com"
                            autoCapitalize="username"
                            className="h-11"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                        />

                    </Field>

                    <Field>
                        <div className="flex items-center justify-between">
                            <FieldLabel>
                                Password
                            </FieldLabel>
                            <Link
                                to={"/auth/forgot-password"}
                                className="text-xs font-medium text-primary hover:underline"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            className="h-11"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </Field>

                    {
                        error && (
                            <p className="mt-3 text-sm text-destructive">{error}</p>
                        )
                    }

                    <Button
                        type="submit"
                        className="mt-6 h-11 w-full"
                    >
                        {
                            isSubmitting ? (
                                <>
                                    <Spinner
                                        className="size-4"
                                    />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )
                        }

                    </Button>


                </FieldGroup>
            </form>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheckIcon className="size-3.5" />
                Protected by SSO and 2-factor verification
            </div>
        </div>
    )
}