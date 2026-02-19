import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { 
  GolfCourse, 
  CourseSearchResponse,
  Hole
} from '../models/golf-course/golf-course-module';
import { golfCourseApiKey } from '../enviroments/enviroments';

@Injectable({
  providedIn: 'root',
})
export class CourseAPIService {

  //
  // Variables
  //
  
  private baseUrl = golfCourseApiKey.golfApi.baseUrl;
  private apiKey = golfCourseApiKey.golfApi.apiKey;
  
  // Search results observable
  private searchResultsSubject = new BehaviorSubject<GolfCourse[]>([]);
  public searchResults$ = this.searchResultsSubject.asObservable();
  
  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('[CourseAPIService] Service initialized');
    console.log('[CourseAPIService] Base URL:', this.baseUrl);
  }

  //
  // Search Courses
  //

  searchCourses(searchQuery: string): void {
    console.log('[CourseAPIService] Searching courses:', searchQuery);
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      console.log('[CourseAPIService] Empty search query');
      this.searchResultsSubject.next([]);
      return;
    }
    
    this.loadingSubject.next(true);
    
    const headers = new HttpHeaders({
      Authorization: `Key ${this.apiKey}`
    });
    
    const params = { search_query: searchQuery.trim() };
    
    this.http.get<CourseSearchResponse>(`${this.baseUrl}/search`, { headers, params }).pipe(
      tap(response => {
        console.log('[CourseAPIService] Search response:', response);
        console.log('[CourseAPIService] Courses found:', response.courses?.length || 0);
      }),
      map(response => response.courses || []),
      catchError(err => {
        console.error('[CourseAPIService] Search error:', err);
        this.loadingSubject.next(false);
        return of([]);
      })
    ).subscribe({
      next: courses => {
        console.log('[CourseAPIService] Updating results:', courses.length);
        this.searchResultsSubject.next(courses);
        this.loadingSubject.next(false);
      },
      error: err => {
        console.error('[CourseAPIService] Subscription error:', err);
        this.searchResultsSubject.next([]);
        this.loadingSubject.next(false);
      }
    });
  }

  //
  // Get Course by ID
  //

  getCourseById(courseId: number): Observable<GolfCourse | null> {
    console.log('[CourseAPIService] Fetching course by ID:', courseId);
    
    const headers = new HttpHeaders({
      Authorization: `Key ${this.apiKey}`
    });
    
    return this.http.get<{ course: GolfCourse }>(`${this.baseUrl}/courses/${courseId}`, { headers }).pipe(
      map(response => response.course),  // <-- unwrap the nested course
      tap(course => {
        console.log('[CourseAPIService] Course received:', course?.course_name);
        console.log('[CourseAPIService] Club:', course?.club_name);
      }),
      catchError(err => {
        console.error('[CourseAPIService] Get course error:', err);
        return of(null);
      })
    );
  }

  //
  // Clear Results
  //

  clearSearchResults(): void {
    console.log('[CourseAPIService] Clearing search results');
    this.searchResultsSubject.next([]);
  }

  //
  // Extract Course Data
  //

  // Get tee names for course
  getTeeNames(course: GolfCourse, isMale: boolean = true): string[] {
    console.log('[CourseAPIService] Getting tee names for:', course.course_name);
    console.log('[CourseAPIService] Gender:', isMale ? 'Male' : 'Female');
    
    const tees = isMale ? course.tees.male : course.tees.female;
    const teeNames = tees.map(tee => tee.tee_name);
    
    console.log('[CourseAPIService] Available tees:', teeNames);
    return teeNames;
  }

  // Get holes from tee box
  getHolesFromTeeBox(course: GolfCourse, teeName: string, isMale: boolean = true): Hole[] {
    console.log('[CourseAPIService] Getting holes for tee:', teeName);
    console.log('[CourseAPIService] Gender:', isMale ? 'Male' : 'Female');
    
    const tees = isMale ? course.tees.male : course.tees.female;
    const selectedTee = tees.find(tee => tee.tee_name === teeName);
    
    if (selectedTee) {
      console.log('[CourseAPIService] Tee found:', selectedTee.tee_name);
      console.log('[CourseAPIService] Holes:', selectedTee.holes.length);
      console.log('[CourseAPIService] Total yards:', selectedTee.total_yards);
      console.log('[CourseAPIService] Par total:', selectedTee.par_total);
      
      return selectedTee.holes;
    } else {
      console.warn('[CourseAPIService] Tee not found:', teeName);
      console.warn('[CourseAPIService] Available:', tees.map(t => t.tee_name));
      return [];
    }
  }

  // Get course ID
  getCourseId(course: GolfCourse): number {
    return course.id;
  }
}