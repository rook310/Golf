// spartanui.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { provideIcons } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NgIcon } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectTrigger, HlmSelectOption } from "@spartan-ng/helm/select";
import { BrnSelectValue, BrnSelectContent } from "@spartan-ng/brain/select";
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import {
  lucideAlignCenter,
  lucideAlignJustify,
  lucideAlignLeft,
  lucideAlignRight,
  lucideChevronDown,
  lucideChevronUp,
} from '@ng-icons/lucide';
import { HlmSelectImports } from '@spartan-ng/helm/select';
//import { NgIcon } from '@ng-icons/core';
import { lucideGitBranch } from '@ng-icons/lucide';
import {
  lucideUser,
  lucideLock,
  lucideMail,
  lucidePhone,
  lucideUserPlus,
  lucideLogOut,
  lucideHome,
  lucideUsers,
  lucideGraduationCap,
  lucideTrophy,
  lucideEdit,
  lucideTrash2,
  lucidePlus,
  lucideAlertCircle,
  lucideLogIn,
  lucideEye,
  lucideEyeOff,
  lucideCheck,
  lucideSend,
  lucideShield,
  lucideX,
  lucideInfo,
  lucideHelpCircle,
  lucideExternalLink,
  lucideCopy,
  lucideRefreshCw,
  lucideArrowRight,
  lucideArrowLeft,
  lucideChevronLeft,
  lucideClipboard,
  lucideTarget,
  lucideStar,
  lucideCpu,
  lucideHeart,
  lucideZap,
  lucideMapPin,
  lucideCalendar,
  lucideFlag,
  lucideMedal ,
  lucideMinus,
  lucideBell
} from '@ng-icons/lucide';

// IMPORTANT: Use spread operator correctly
const SPARTAN_IMPORTS = [
  NgIcon, HlmIcon,
  ...HlmButtonGroupImports,
  ...HlmButtonImports,
  ...HlmIconImports,
  ...HlmInputImports,
  ...HlmInputGroupImports,
  ...HlmTooltipImports,
  ...HlmFormFieldImports,
  ...HlmLabelImports,
  ...HlmTableImports,
  ...BrnSelectImports,
  ...HlmSelectImports,
  ...HlmDialogImports
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    //NgIcon, HlmIcon,
    
    ...SPARTAN_IMPORTS  // Use spread operator here
  ],
  exports: [
    CommonModule,
    //NgIcon, HlmIcon,
    // HlmSelectTrigger, 
    // HlmSelectOption,
    // BrnSelectValue, 
    // BrnSelectContent,
    BrnSelectValue,
    BrnSelectContent,
    HlmSelectTrigger,
    HlmSelectOption,
    
    ...SPARTAN_IMPORTS  // Export everything using spread
  ],
  providers: [
    provideIcons({
      lucideAlignCenter,
      lucideAlignJustify,
      lucideAlignLeft,
      lucideAlignRight,
      lucideChevronDown,
      lucideChevronUp,
      lucideChevronRight,
      lucideGitBranch,
      lucideSend,
      lucideShield,
      lucideUser,
      lucideLock,
      lucideMail,
      lucideBell,
      lucidePhone,
      lucideUserPlus,
      lucideLogOut,
      lucideHome,
      lucideUsers,
      lucideGraduationCap,
      lucideTrophy,
      lucideEdit,
      lucideTrash2,
      lucidePlus,
      lucideAlertCircle,
      lucideLogIn,
      lucideEye,
      lucideEyeOff,
      lucideCheck,
      lucideX,
      lucideInfo,
      lucideHelpCircle,
      lucideExternalLink,
      lucideCopy,
      lucideRefreshCw,
      lucideArrowRight,
      lucideArrowLeft,
      lucideChevronLeft,
      lucideClipboard,
      lucideTarget,
      lucideStar,
      lucideCpu,
      lucideHeart,
      lucideZap,
      lucideMapPin,
      lucideCalendar,
      lucideFlag,
      lucideMedal,
      lucideMinus
    })
  ]
})
export class SpartanuiModule { }