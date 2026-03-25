import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectStore } from '@/store/projectStore'
import { useHubs } from '@/hooks/useProjects'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDarkMode } from '@/hooks/useDarkMode'

export default function Navbar() {
  const { isDark, toggle } = useDarkMode()
  const { selectedHubId, setHub } = useProjectStore()
  const { data: hubsData } = useHubs()

  function handleHubChange(hubId: string | null) {
    if (hubId) {
      setHub(hubId)
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex items-center gap-2 flex-1">
        {hubsData?.data && hubsData.data.length > 1 && (
          <Select value={selectedHubId ?? ''} onValueChange={handleHubChange}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Hub" />
            </SelectTrigger>
            <SelectContent>
              {hubsData.data.map((hub) => (
                <SelectItem key={hub.id} value={hub.id}>
                  {hub.attributes.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Dark mode toggle */}
      <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  )
}
