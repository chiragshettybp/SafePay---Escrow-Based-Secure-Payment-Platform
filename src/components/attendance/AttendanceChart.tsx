
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceChartProps {
  present: number;
  absent: number;
}

export function AttendanceChart({ present, absent }: AttendanceChartProps) {
  const total = present + absent;
  const presentPercentage = Math.round((present / total) * 100);
  
  const data = [
    { name: 'Present', value: present },
    { name: 'Absent', value: absent },
  ];
  
  const COLORS = ['hsl(var(--success))', 'hsl(var(--destructive))'];
  
  return (
    <Card className="glass-card w-full">
      <CardContent className="p-6">
        <div className="text-center mb-2">
          <h3 className="text-lg font-medium">Overall Attendance</h3>
          <p className="text-4xl font-bold my-2 text-gradient">{presentPercentage}%</p>
          <p className="text-sm text-muted-foreground">
            {present} classes attended out of {total}
          </p>
        </div>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 17, 22, 0.8)', 
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: 'white'
                }}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center" 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
