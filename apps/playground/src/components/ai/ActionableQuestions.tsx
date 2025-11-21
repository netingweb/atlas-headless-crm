import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Link, Filter, ArrowRight, HelpCircle, FileText } from 'lucide-react';

export interface ActionableQuestion {
  question: string;
  action: string;
  category:
    | 'confirmation'
    | 'follow_up_creation'
    | 'search_refinement'
    | 'related_action'
    | 'clarification';
  priority?: number;
  icon?: string;
  tool_call_context?: {
    tool_name: string;
    tool_result?: unknown;
  };
}

interface ActionableQuestionsProps {
  questions: ActionableQuestion[];
  onQuestionClick: (action: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Link,
  Filter,
  ArrowRight,
  HelpCircle,
  FileText,
};

export function ActionableQuestions({ questions, onQuestionClick }: ActionableQuestionsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  // Sort by priority if available
  const sortedQuestions = [...questions].sort((a, b) => {
    const priorityA = a.priority ?? 999;
    const priorityB = b.priority ?? 999;
    return priorityA - priorityB;
  });

  // All actionable buttons use secondary variant
  const buttonVariant = 'secondary' as const;

  const getIcon = (question: ActionableQuestion) => {
    if (question.icon && iconMap[question.icon]) {
      const IconComponent = iconMap[question.icon];
      return <IconComponent className="h-4 w-4 mr-2" />;
    }

    // Default icons by category
    switch (question.category) {
      case 'follow_up_creation':
        return <Plus className="h-4 w-4 mr-2" />;
      case 'search_refinement':
        return <Filter className="h-4 w-4 mr-2" />;
      case 'related_action':
        return <ArrowRight className="h-4 w-4 mr-2" />;
      case 'clarification':
        return <HelpCircle className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-600 mb-2">Azioni suggerite:</p>
      <div className="flex flex-wrap gap-2">
        {sortedQuestions.map((question, index) => (
          <Button
            key={index}
            variant={buttonVariant}
            size="sm"
            onClick={() => onQuestionClick(question.action)}
            className="text-sm"
          >
            {getIcon(question)}
            {question.question}
          </Button>
        ))}
      </div>
    </div>
  );
}
