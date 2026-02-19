import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaderBoard } from './leader-board';

describe('LeaderBoard', () => {
  let component: LeaderBoard;
  let fixture: ComponentFixture<LeaderBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeaderBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaderBoard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
