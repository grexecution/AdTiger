"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface RecommendationFeedbackProps {
  recommendationId: string
  initialFeedback?: {
    label: "THUMBS_UP" | "THUMBS_DOWN" | "IGNORED"
    note?: string
  }
  onFeedbackSubmit?: (feedback: any) => void
}

export function RecommendationFeedback({
  recommendationId,
  initialFeedback,
  onFeedbackSubmit
}: RecommendationFeedbackProps) {
  const [feedback, setFeedback] = useState(initialFeedback?.label)
  const [note, setNote] = useState(initialFeedback?.note || "")
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleFeedback = async (type: "THUMBS_UP" | "THUMBS_DOWN") => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          label: type,
          note: note || undefined
        })
      })

      if (!response.ok) throw new Error("Failed to submit feedback")

      const data = await response.json()
      setFeedback(type)
      setShowNoteInput(false)
      
      if (onFeedbackSubmit) {
        onFeedbackSubmit(data)
      }

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNoteSubmit = async () => {
    if (!feedback || (feedback !== "THUMBS_UP" && feedback !== "THUMBS_DOWN")) return
    await handleFeedback(feedback)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border p-1">
        <Button
          variant={feedback === "THUMBS_UP" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => handleFeedback("THUMBS_UP")}
          disabled={isSubmitting}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="sr-only">Thumbs up</span>
        </Button>
        <Button
          variant={feedback === "THUMBS_DOWN" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => handleFeedback("THUMBS_DOWN")}
          disabled={isSubmitting}
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="sr-only">Thumbs down</span>
        </Button>
      </div>

      <Popover open={showNoteInput} onOpenChange={setShowNoteInput}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isSubmitting}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Add note</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Add a note</h4>
              <p className="text-sm text-muted-foreground">
                Help us understand your feedback better
              </p>
            </div>
            <Textarea
              placeholder="Tell us more about your decision..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNoteInput(false)
                  setNote("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleNoteSubmit}
                disabled={!note.trim() || isSubmitting}
              >
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}