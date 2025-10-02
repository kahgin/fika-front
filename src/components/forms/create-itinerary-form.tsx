"use client"

import React, { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CalendarIcon, Plus, Minus } from "lucide-react"

interface CreateItineraryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  flexibleDays: z.string().optional(),
  flexibleMonth: z.string().optional(),
  adults: z.number().min(1).max(10),
  children: z.number().min(0).max(10),
  pets: z.number().min(0).max(5),
  budget: z.string().min(1, "Budget is required"),
  pacing: z.string().min(1, "Pacing is required"),
  interests: z.array(z.string()),
}).refine((data: any) => {
  const hasSpecific = !!data.startDate && !!data.endDate
  const hasFlexible = !!data.flexibleDays && !!data.flexibleMonth
  return hasSpecific || hasFlexible
}, { message: "Please select travel dates", path: ["startDate"] })

type FormData = z.infer<typeof formSchema>

const CreateItineraryForm: React.FC<CreateItineraryFormProps> = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [dateMode, setDateMode] = useState<"specific" | "flexible">("flexible")
  const [showDateDialog, setShowDateDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(1)
      form.reset()
    }
    onOpenChange(newOpen)
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      startDate: undefined,
      endDate: undefined,
      flexibleDays: "1",
      flexibleMonth: "",
      adults: 2,
      children: 0,
      pets: 0,
      budget: "any",
      pacing: "balanced",
      interests: [],
    },
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(Date.now() + 86400000) })

  const pacingOptions = [
    { value: "relaxed", label: "Relaxed" },
    { value: "balanced", label: "Balanced" },
    { value: "packed", label: "Packed" },
  ]

  const interestOptions = [
    "Food & Dining", "Culture & History", "Adventure & Sports", "Nature & Wildlife",
    "Shopping", "Nightlife", "Photography", "Art & Museums", "Beaches",
    "Mountains", "Architecture", "Local Experiences",
  ]

  const months = [
    { value: "september", label: "September" }, { value: "october", label: "October" },
    { value: "november", label: "November" }, { value: "december", label: "December" },
    { value: "january", label: "January" }, { value: "february", label: "February" },
    { value: "march", label: "March" }, { value: "april", label: "April" },
    { value: "may", label: "May" }, { value: "june", label: "June" },
    { value: "july", label: "July" }, { value: "august", label: "August" },
  ]

  const handleInputChange = (field: keyof FormData, value: any) => {
    form.setValue(field as any, value, { shouldDirty: true, shouldValidate: false })
  }

  const watchInterests = form.watch("interests") || []
  const toggleInterest = (interest: string) => {
    const exists = watchInterests.includes(interest)
    const next = exists ? watchInterests.filter((i) => i !== interest) : [...watchInterests, interest]
    form.setValue("interests", next, { shouldDirty: true })
  }

  const handleDateDialogSave = () => {
    if (dateMode === "specific") {
      if (dateRange?.from) {
        form.setValue("startDate", dateRange.from)
        form.setValue("endDate", dateRange?.to)
      }
      form.setValue("flexibleDays", undefined as any)
      form.setValue("flexibleMonth", undefined as any)
    } else {
      form.setValue("startDate", undefined)
      form.setValue("endDate", undefined)
    }
    setShowDateDialog(false)
  }

  const canProceed = () => {
    if (currentStep === 1) {
      const v = form.getValues()
      const hasDestination = !!v.destination
      const hasDates = dateMode === "specific" ? !!v.startDate && !!v.endDate : !!v.flexibleDays && !!v.flexibleMonth
      return hasDestination && hasDates && !!v.budget && !!v.pacing
    }
    return true
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canProceed() && currentStep < 2) {
      setCurrentStep(s => s + 1)
    }
  }

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentStep > 1) {
      setCurrentStep(s => s - 1)
    }
  }

  const generateAPIPayload = () => ({
    destination: form.getValues("destination"),
    dates: dateMode === "specific"
      ? { type: "specific", startDate: form.getValues("startDate")?.toISOString().split("T")[0], endDate: form.getValues("endDate")?.toISOString().split("T")[0] }
      : { type: "flexible", days: parseInt(form.getValues("flexibleDays") || "0"), preferredMonth: form.getValues("flexibleMonth") || "" },
    travelers: { adults: form.getValues("adults"), children: form.getValues("children"), pets: form.getValues("pets") },
    preferences: { budget: form.getValues("budget"), pacing: form.getValues("pacing"), interests: form.getValues("interests") },
  })

  const onSubmit = () => {
    console.log("API Payload:", generateAPIPayload())
    handleOpenChange(false)
  }

  const StepOne = () => {
    const d = form.watch()
    const dateDisplay = useMemo(() => {
      if (dateMode === "specific" && d.startDate && d.endDate) return `${format(d.startDate, "LLL dd, y")} - ${format(d.endDate, "LLL dd, y")}`
      if (dateMode === "flexible" && d.flexibleDays) {
        const label = months.find((m) => m.value === d.flexibleMonth)?.label
        return `${d.flexibleDays} days${label ? ` in ${label}` : ""}`
      }
      return "Select dates"
    }, [dateMode, d.startDate, d.endDate, d.flexibleDays, d.flexibleMonth])

    const whoDisplay = useMemo(() => {
      const total = (d.adults || 0) + (d.children || 0)
      const base = `${total} ${total === 1 ? "traveler" : "travelers"}`
      return d.pets ? `${base}, pets` : base
    }, [d.adults, d.children, d.pets])

    return (
      <div className="space-y-4">
        <FormField name="destination" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Destination</FormLabel>
            <FormControl><Input placeholder="Where are you going?" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormItem><FormLabel>When</FormLabel><Input readOnly value={dateDisplay} onClick={() => setShowDateDialog(true)} className="cursor-pointer" /></FormItem>
        <FormItem><FormLabel>Who</FormLabel><Input readOnly value={whoDisplay} onClick={() => setShowWhoDialog(true)} className="cursor-pointer" /></FormItem>
        <FormItem><FormLabel>Budget</FormLabel>
          <Input readOnly value={{ any: "Any budget", tight: "On a budget", sensible: "Sensibly priced", upscale: "Upscale", luxury: "Luxury" }[d.budget || "any"]} onClick={() => setShowBudgetDialog(true)} className="cursor-pointer" />
        </FormItem>
        <FormItem><FormLabel>Travel Pacing</FormLabel>
          <Input readOnly value={pacingOptions.find((p) => p.value === d.pacing)?.label || "Select pacing"} onClick={() => setShowPacingDialog(true)} className="cursor-pointer" />
        </FormItem>
      </div>
    )
  }

  const StepTwo = () => (
    <div>
      <Label>Interests</Label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {interestOptions.map((i) => (
          <Button key={i} type="button" variant={watchInterests.includes(i) ? "default" : "outline"} onClick={() => toggleInterest(i)}>{i}</Button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-auto">
          <DialogHeader><DialogTitle>Create Trip</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && <StepOne />}
              {currentStep === 2 && <StepTwo />}
              <div className="flex gap-3 pt-4 w-full">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
                {currentStep < 2 ? (
                  <Button type="button" onClick={handleNext} disabled={!canProceed()} className="w-full">
                    Next
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1">Create Itinerary</Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Inline dialogs */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent> 
          <DialogHeader><DialogTitle>When</DialogTitle></DialogHeader>
          <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as any)} className="items-center">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="specific" >Dates</TabsTrigger>
              <TabsTrigger value="flexible" >Flexible</TabsTrigger>
            </TabsList>
            <TabsContent value="specific" className="space-y-4 my-4 w-full">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} min={1} max={10} numberOfMonths={2} disabled={(d) => d < new Date()} className="p-0" />
              <p className="text-muted-foreground text-center text-xs">The trip must be between 1 and 10 days</p>
            </TabsContent>
            <TabsContent value="flexible" className="space-y-4 my-4 w-full">
              <Label>How many days?</Label>
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button type="button" variant="outline" size="icon" onClick={() => handleInputChange("flexibleDays", String(Math.max(1, parseInt(form.getValues("flexibleDays") || "1") - 1)))}><Minus /></Button>
                <span className="text-2xl font-semibold w-12 text-center">{form.getValues("flexibleDays")}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => handleInputChange("flexibleDays", String(Math.min(10, parseInt(form.getValues("flexibleDays") || "1") + 1)))}><Plus /></Button>
              </div>
              <Label>Travel anytime</Label>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {months.map((m) => (
                  <Button 
                  key={m.value} 
                  variant={form.getValues("flexibleMonth") === m.value ? "default" : "outline"} 
                  onClick={() => handleInputChange("flexibleMonth", m.value)}
                  className="shadow-none flex flex-col h-12"
                  >
                    <CalendarIcon className="size-6" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button onClick={handleDateDialogSave}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhoDialog} onOpenChange={setShowWhoDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Who</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Adults</p>
                <p className="text-sm text-muted-foreground">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  disabled={form.watch("adults") <= 1}
                  onClick={() => form.setValue("adults", Math.max(1, form.watch("adults") - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {form.watch("adults")}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  onClick={() => form.setValue("adults", Math.min(10, form.watch("adults") + 1))}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Children</p>
                <p className="text-sm text-muted-foreground">Ages 12 or below</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  disabled={form.watch("children") <= 0}
                  onClick={() => form.setValue("children", Math.max(0, form.watch("children") - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {form.watch("children")}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  onClick={() => form.setValue("children", Math.min(10, form.watch("children") + 1))}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {/* Pets */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pets</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  disabled={form.watch("pets") <= 0}
                  onClick={() => form.setValue("pets", Math.max(0, form.watch("pets") - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {form.watch("pets")}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                  onClick={() => form.setValue("pets", Math.min(5, form.watch("pets") + 1))}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setShowWhoDialog(false)}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Budget</DialogTitle>
          </DialogHeader>
          <RadioGroup
            value={form.watch("budget")}
            onValueChange={(val) => form.setValue("budget", val)}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="any" id="any" />
              <label className="text-sm" htmlFor="any">Any budget</label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="tight" id="tight" />
              <label className="text-sm" htmlFor="tight"><span className="mr-2">$</span>On a budget</label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="sensible" id="sensible" />
              <label className="text-sm" htmlFor="sensible"><span className="mr-2">$$</span>Sensibly priced</label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="upscale" id="upscale" />
              <label className="text-sm" htmlFor="upscale"><span className="mr-2">$$$</span>Upscale</label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="luxury" id="luxury" />
              <label className="text-sm" htmlFor="luxury"><span className="mr-2">$$$$</span>Luxury</label>
            </div>
          </RadioGroup>
          <DialogFooter><Button onClick={() => setShowBudgetDialog(false)}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPacingDialog} onOpenChange={setShowPacingDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Pacing</DialogTitle>
          </DialogHeader>
          <RadioGroup
            value={form.watch("pacing")}
            onValueChange={(val) => form.setValue("pacing", val)}
          >
            {pacingOptions.map((p) => (
              <div key={p.value} className="flex items-center space-x-3">
                <RadioGroupItem value={p.value} id={p.value} />
                <label className="text-sm" htmlFor={p.value}>
                  {p.label}
                </label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button onClick={() => setShowPacingDialog(false)}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

export default CreateItineraryForm
