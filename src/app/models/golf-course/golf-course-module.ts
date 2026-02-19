//Course API STORAGE

// hole info per course
export interface Hole {
  par: number;
  yardage: number;
  handicap?: number; //some don have this
}

// tee box info
export interface TeeBox {
  tee_name: string;
  course_rating: number;
  slope_rating: number;
  bogey_rating: number;
  total_yards: number;
  total_meters: number;
  number_of_holes: number;
  par_total: number;
  front_course_rating: number;
  front_slope_rating: number;
  front_bogey_rating: number;
  back_course_rating: number;
  back_slope_rating: number;
  back_bogey_rating: number;
  holes: Hole[];
}

//location info
export interface CourseLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

//gender tee info
export interface Tees {
  female: TeeBox[];
  male: TeeBox[];
}

//real info i care about, the golf course Info
export interface GolfCourse {
  id: number;
  club_name: string;
  course_name: string;
  location: CourseLocation;
  tees: Tees;
}

//search
export interface CourseSearchResponse {
  courses: GolfCourse[];
}

//usable Info, for now
export interface SimplifiedCourseInfo {
  apiCourseId: number;
  courseName: string;
  clubName: string;
  selectedTee: string;
  holes: Hole[];
}