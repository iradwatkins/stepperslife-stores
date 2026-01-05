import { GraduationCap } from 'lucide-react'

export function ClassesSection() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Classes Coming Soon
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We're working on bringing you amazing classes and workshops.
            Learn new skills, connect with instructors, and grow in your community.
          </p>
          <div className="mt-8">
            <button
              type="button" className="inline-flex h-12 items-center justify-center rounded-md bg-muted px-8 text-sm font-medium hover:bg-muted/80">
              Notify Me When Available
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
