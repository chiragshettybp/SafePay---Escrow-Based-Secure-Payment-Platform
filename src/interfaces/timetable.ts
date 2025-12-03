
export interface Subject {
  id: string;
  name: string;
  present: number;
  total: number;
  schedule: {
    day: string;
    time: string;
  }[];
}

export interface TimetableData {
  subjects: Subject[];
}

export interface BunkDate {
  day: string;
  date: string;
  time: string;
}

export interface BunkRecommendation {
  subject: Subject;
  canBunk: number;
  bunkDates: BunkDate[];
  currentPercentage: number;
  minRequiredClasses: number;
}

