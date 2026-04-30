import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { SystemConfigService } from '../../services/system-config.service';
import { User, UserRole, ChatbotMode } from '../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private systemConfigService = inject(SystemConfigService);

  form!: FormGroup;
  users: User[] = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  editingUserId: string | null = null;
  publicRegistrationEnabled = false;

  // Configuración global del chatbot
  chatbotGloballyEnabled = true;
  chatbotMessagesPerWeek = 5;
  chatbotMessagesPerWeekAdmin = 100;
  chatbotConfigSaving = false;

  readonly UserRole = UserRole;
  readonly ChatbotMode = ChatbotMode;

  ngOnInit() {
    this.initForm();
    this.loadUsers();
    this.loadSettings();
    this.loadChatbotConfig();
  }

  initForm() {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', Validators.required],
      role: [UserRole.USER, Validators.required],
      chatbotMode: [ChatbotMode.DISABLED, Validators.required],
    });
  }

  loadChatbotConfig() {
    this.systemConfigService.getSystemConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.chatbotGloballyEnabled = response.data.chatbotGloballyEnabled ?? true;
          this.chatbotMessagesPerWeek = response.data.chatbotMessagesPerWeek ?? 5;
          this.chatbotMessagesPerWeekAdmin = response.data.chatbotMessagesPerWeekAdmin ?? 100;
        }
      },
      error: (error) => {
        console.error('Error cargando configuración del chatbot:', error);
      },
    });
  }

  saveChatbotConfig() {
    this.chatbotConfigSaving = true;
    this.systemConfigService
      .updateChatbotConfig({
        chatbotGloballyEnabled: this.chatbotGloballyEnabled,
        chatbotMessagesPerWeek: this.chatbotMessagesPerWeek,
        chatbotMessagesPerWeekAdmin: this.chatbotMessagesPerWeekAdmin,
      })
      .subscribe({
        next: () => {
          this.successMessage = 'Configuración del chatbot guardada';
          this.chatbotConfigSaving = false;
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Error al guardar la configuración del chatbot';
          this.chatbotConfigSaving = false;
        },
      });
  }

  setUserChatbotMode(user: User, mode: ChatbotMode) {
    if (user.chatbotMode === mode) return;
    const previous = user.chatbotMode;
    user.chatbotMode = mode;
    this.authService.updateUser(user.id, { chatbotMode: mode } as any).subscribe({
      next: () => {
        this.successMessage = `Chatbot de "${user.username}": ${this.getChatbotModeLabel(mode)}`;
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error al actualizar el modo del chatbot';
        user.chatbotMode = previous; // revertir UI si falla
      },
    });
  }

  getChatbotModeLabel(mode?: ChatbotMode): string {
    switch (mode) {
      case ChatbotMode.ENABLED: return 'Activo';
      case ChatbotMode.BETA: return 'Beta';
      case ChatbotMode.DISABLED:
      default: return 'Desactivado';
    }
  }

  loadSettings() {
    this.settingsService.getSettings().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.publicRegistrationEnabled = response.data.publicRegistrationEnabled;
        }
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
      },
    });
  }

  loadUsers() {
    this.isLoading = true;
    this.authService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.users = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error cargando usuarios';
        console.error('Error cargando usuarios:', error);
        this.isLoading = false;
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.editingUserId) {
      // Modo edición
      const updateData: any = {
        username: this.form.value.username,
        nombre: this.form.value.nombre,
        role: this.form.value.role,
        chatbotMode: this.form.value.chatbotMode,
      };

      // Solo incluir password si se ha cambiado
      if (this.form.value.password) {
        updateData.password = this.form.value.password;
      }

      this.authService.updateUser(this.editingUserId, updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Usuario actualizado correctamente';
            this.cancelEdit();
            this.loadUsers();
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Error al actualizar el usuario';
          this.isSubmitting = false;
        },
      });
    } else {
      // Modo creación
      this.authService.createUser(this.form.value).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Usuario creado correctamente';
            this.form.reset({ role: UserRole.USER, chatbotMode: ChatbotMode.DISABLED });
            this.loadUsers();
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.error || 'Error al crear el usuario';
          this.isSubmitting = false;
        },
      });
    }
  }

  editUser(user: User) {
    this.editingUserId = user.id;
    this.form.patchValue({
      username: user.username,
      nombre: user.nombre,
      role: user.role,
      chatbotMode: user.chatbotMode ?? ChatbotMode.DISABLED,
      password: '',
    });

    // Hacer que el password sea opcional en modo edición
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();

    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit() {
    this.editingUserId = null;
    this.form.reset({ role: UserRole.USER, chatbotMode: ChatbotMode.DISABLED });

    // Restaurar validación de password
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
  }

  togglePublicRegistration() {
    this.settingsService.updateSettings({ publicRegistrationEnabled: this.publicRegistrationEnabled }).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Registro público ${this.publicRegistrationEnabled ? 'activado' : 'desactivado'}`;
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error al actualizar la configuración';
        // Revertir el cambio
        this.publicRegistrationEnabled = !this.publicRegistrationEnabled;
      },
    });
  }

  deleteUser(userId: string, username: string) {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.authService.deleteUser(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Usuario "${username}" eliminado correctamente`;
          this.loadUsers();
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Error al eliminar el usuario';
      },
    });
  }

  getRoleLabel(role: UserRole): string {
    return role === UserRole.ADMIN ? '🧙‍♂️ Admin' : '👤 Usuario';
  }
}
