import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LayoutDashboard, ListChecks, GitGraph, FolderKanban, LogOut, ChevronsUpDown, FileText, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { useHubs, useProjects } from '@/hooks/useProjects'
import api from '@/api/axiosInstance'
import { useEffect } from 'react'

const coreNavItems = [
  { label: 'Analitica', to: '/', icon: LayoutDashboard },
  { label: 'Issues', to: '/issues', icon: ListChecks },
  { label: 'Grafo', to: '/graph', icon: GitGraph },
]

const documentNavItems = [
  { label: 'Oficios', to: '/documents/oficios', icon: FileText },
  { label: 'Minutas', to: '/documents/minutas', icon: ClipboardList },
]

export default function AppSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const isDocumentsSection = currentPath.startsWith('/documents')

  const { selectedHubId, selectedProjectIds, setHub, toggleProject, selectAll, deselectAll } =
    useProjectStore()

  const { data: hubsData } = useHubs()
  const { data: projectsData } = useProjects(selectedHubId)
  const projects = projectsData?.data ?? []

  useEffect(() => {
    if (hubsData?.data?.length && !selectedHubId) {
      setHub(hubsData.data[0].id)
    }
  }, [hubsData, selectedHubId, setHub])

  const allProjectIds = projects.map((p) => p.id)
  const allSelected = allProjectIds.length > 0 && allProjectIds.every((id) => selectedProjectIds.includes(id))
  const someSelected = allProjectIds.some((id) => selectedProjectIds.includes(id))

  function handleToggleAll() {
    if (allSelected) {
      deselectAll()
    } else {
      selectAll(allProjectIds)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold tracking-tight text-primary-foreground">CB</span>
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            CurrieBrown
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Incidencias</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map((item) => {
                const isActive = currentPath === item.to
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} className={cn(isActive && 'font-medium')} />}
                      isActive={isActive}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Documentos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documentNavItems.map((item) => {
                const isActive = currentPath === item.to
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<Link to={item.to} className={cn(isActive && 'font-medium')} />}
                      isActive={isActive}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isDocumentsSection ? (
          <SidebarGroup>
            <SidebarGroupLabel>
              <FolderKanban className="mr-1.5 size-3.5" />
              Proyectos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="group-data-[collapsible=icon]:hidden space-y-1 px-2">
                {projects.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    {selectedHubId ? 'Cargando...' : 'Selecciona un hub'}
                  </p>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected
                        }}
                        onChange={handleToggleAll}
                        className="size-3.5 rounded accent-primary"
                      />
                      Todos los proyectos
                    </label>
                    <div className="mx-2 border-b border-border/50" />
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(project.id)}
                          onChange={() => toggleProject(project.id)}
                          className="size-3.5 rounded accent-primary"
                        />
                        <span className="truncate">{project.attributes.name}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

function UserMenu() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      logout()
      navigate({ to: '/login' }).catch(console.error)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-12 w-full min-w-0 overflow-hidden">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user?.profileImages?.sizeX40} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden leading-tight">
                <span className="block truncate text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user?.emailId}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">{user?.emailId}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 size-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
