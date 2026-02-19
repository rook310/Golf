import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameInvite } from './game-invite';

describe('GameInvite', () => {
  let component: GameInvite;
  let fixture: ComponentFixture<GameInvite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameInvite]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameInvite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
