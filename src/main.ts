import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { supabaseInterceptor } from './app/core/interceptors/supabase.interceptor';
import { PrecargaSegura } from './app/core/routing/precarga-segura.strategy';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    // Precarga en segundo plano solo las rutas sin canMatch (las de Administrador no)
    provideRouter(routes, withPreloading(PrecargaSegura), withComponentInputBinding()),
    // HttpClient con el interceptor que añade el token JWT de Supabase
    provideHttpClient(withFetch(), withInterceptors([supabaseInterceptor])),
    // PWA: service worker (solo en producción) para instalar la app y cachear recursos
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
});
