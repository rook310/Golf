import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPlayer } from './add-player';

describe('AddPlayer', () => {
  let component: AddPlayer;
  let fixture: ComponentFixture<AddPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPlayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
