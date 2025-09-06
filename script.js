// script.js - 使用 Supabase 实现实时同步 (完全修正版)
document.addEventListener('DOMContentLoaded', function() {
  // 首先检查 Supabase 库是否已加载
  if (typeof supabase === 'undefined') {
    console.error('Supabase 库未正确加载，请检查网络连接或CDN链接');
    // 回退到本地存储
    loadFallbackData();
    return;
  }

  // Supabase 配置
  const SUPABASE_URL = 'https://jowzvigeeiizylcsadgx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3p2aWdlZWlpenlsY3NhZGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMjIxOTQsImV4cCI6MjA3MjY5ODE5NH0.9RnjFr1BaiNKpBTLNXvQG3yQzhA98AC81Bxkv4lMl3c';

  // 初始化 Supabase 客户端
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 常量定义
  const SEMESTER_START = new Date(2025, 8, 1);
  const TOTAL_WEEKS = 22;
  const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

  // 内嵌示例数据
  const EMBEDDED_SAMPLE = [
    {"table_id":1,"week":3,"day":"一","status":"free"},
    {"table_id":1,"week":3,"day":"二","status":"booked"},
    {"table_id":1,"week":3,"day":"三","status":"free"},
    {"table_id":1,"week":3,"day":"四","status":"free"},
    {"table_id":1,"week":3,"day":"五","status":"booked"},
    {"table_id":1,"week":3,"day":"六","status":"free"},
    {"table_id":1,"week":3,"day":"日","status":"free"},
    {"table_id":1,"week":4,"day":"一","status":"booked"},
    {"table_id":1,"week":4,"day":"二","status":"free"},
    {"table_id":1,"week":4,"day":"三","status":"free"},
    {"table_id":1,"week":4,"day":"四","status":"free"},
    {"table_id":1,"week":4,"day":"五","status":"free"},
    {"table_id":1,"week":4,"day":"六","status":"booked"},
    {"table_id":1,"week":4,"day":"日","status":"free"},
    {"table_id":2,"week":3,"day":"一","status":"free"},
    {"table_id":2,"week":3,"day":"二","status":"free"},
    {"table_id":2,"week":3,"day":"三","status":"booked"},
    {"table_id":2,"week":3,"day":"四","status":"free"},
    {"table_id":2,"week":3,"day":"五","status":"free"},
    {"table_id":2,"week":3,"day":"六","status":"free"},
    {"table_id":2,"week":3,"day":"日","status":"booked"},
    {"table_id":2,"week":4,"day":"一","status":"free"},
    {"table_id":2,"week":4,"day":"二","status":"booked"},
    {"table_id":2,"week":4,"day":"三","status":"free"},
    {"table_id":2,"week":4,"day":"四","status":"free"},
    {"table_id":2,"week":4,"day":"五","status":"free"},
    {"table_id":2,"week":4,"day":"六","status":"free"},
    {"table_id":2,"week":4,"day":"日","status":"free"}
  ];

  // 主加载函数
  async function loadSchedule() {
    try {
      // 从 Supabase 获取数据
      const { data: scheduleData, error } = await supabaseClient
        .from('schedules')
        .select('*');
      
      if (error) {
        console.error('从Supabase获取数据错误:', error);
        // 回退到本地存储或示例数据
        await loadFallbackData();
        return;
      }
      
      // 渲染表格
      renderSchedule('grid1', scheduleData.filter(item => item.table_id === 1));
      renderSchedule('grid2', scheduleData.filter(item => item.table_id === 2));
      
      // 如果是管理员页面，添加编辑功能
      if (isAdminPage()) {
        addEditFunctionality('grid1', 1);
        addEditFunctionality('grid2', 2);
      } else {
        // 如果是展示页面，设置实时订阅
        setupRealtimeSubscription();
      }
    } catch (error) {
      console.error('加载日程失败:', error);
      await loadFallbackData();
    }
  }

  // 回退数据加载
  async function loadFallbackData() {
    try {
      const stored = window.localStorage.getItem('schedule_data');
      if (stored) {
        const scheduleData = JSON.parse(stored);
        renderSchedule('grid1', scheduleData.filter(item => item.table_id === 1));
        renderSchedule('grid2', scheduleData.filter(item => item.table_id === 2));
        
        if (isAdminPage()) {
          addEditFunctionality('grid1', 1);
          addEditFunctionality('grid2', 2);
        }
        return;
      }
    } catch (e) {
      console.error('加载回退数据错误:', e);
    }
    
    // 使用内嵌示例数据
    renderSchedule('grid1', EMBEDDED_SAMPLE.filter(item => item.table_id === 1));
    renderSchedule('grid2', EMBEDDED_SAMPLE.filter(item => item.table_id === 2));
    
    if (isAdminPage()) {
      addEditFunctionality('grid1', 1, EMBEDDED_SAMPLE);
      addEditFunctionality('grid2', 2, EMBEDDED_SAMPLE);
    }
  }

  // 渲染表格
  function renderSchedule(gridId, data) {
    const grid = document.getElementById(gridId);
    if (!grid) {
      console.error(`找不到元素 #${gridId}`);
      return;
    }
    
    grid.innerHTML = '';
    
    for (let week = 1; week <= TOTAL_WEEKS; week++) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>第${week}周</td>`;
      
      const startDate = weekStartDate(week);
      
      DAYS.forEach((day, index) => {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + index);
        const dateStr = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;
        
        const cell = document.createElement('td');
        // 查找数据中对应条目
        const record = data.find(d => d.week === week && d.day === day);
        const status = record ? record.status : 'free';
        
        cell.innerHTML = `
          <div class="date">${dateStr}</div>
          <div class="status">${status === 'booked' ? '●' : ''}</div>
        `;
        cell.className = `cell ${status}`;
        cell.dataset.week = week;
        cell.dataset.day = day;
        
        row.appendChild(cell);
      });
      
      grid.appendChild(row);
    }
  }

  // 添加编辑功能
  function addEditFunctionality(gridId, tableId, fallbackData) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.addEventListener('click', async (ev) => {
      const cell = ev.target.closest('td');
      if (!cell || !cell.dataset.week) return;
      
      const week = parseInt(cell.dataset.week);
      const day = cell.dataset.day;
      const currentStatus = cell.classList.contains('free') ? 'free' : 'booked';
      const newStatus = currentStatus === 'free' ? 'booked' : 'free';
      
      // 更新 UI
      cell.className = `cell ${newStatus}`;
      const statusDiv = cell.querySelector('.status');
      if (statusDiv) statusDiv.textContent = newStatus === 'booked' ? '●' : '';
      
      // 保存到 Supabase
      try {
        // 检查是否已存在记录
        const { data: existingRecords } = await supabaseClient
          .from('schedules')
          .select('id')
          .eq('table_id', tableId)
          .eq('week', week)
          .eq('day', day);
        
        if (existingRecords && existingRecords.length > 0) {
          // 更新现有记录
          const { error } = await supabaseClient
            .from('schedules')
            .update({ status: newStatus })
            .eq('id', existingRecords[0].id);
          
          if (error) throw error;
        } else {
          // 创建新记录
          const { error } = await supabaseClient
            .from('schedules')
            .insert([{ table_id: tableId, week, day, status: newStatus }]);
          
          if (error) throw error;
        }
        
        // 显示成功通知
        showNotification('更改已保存!');
        
        // 更新本地存储作为备份
        updateLocalStorage(tableId, week, day, newStatus);
      } catch (error) {
        console.error('保存到Supabase失败:', error);
        
        // 回退到本地存储
        if (fallbackData) {
          updateLocalStorage(tableId, week, day, newStatus, fallbackData);
        }
        
        showNotification('保存失败，已保存到本地', true);
      }
    });
  }

  // 设置实时订阅
  function setupRealtimeSubscription() {
    try {
      // 订阅 schedules 表的更改
      const subscription = supabaseClient
        .channel('schedules-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'schedules' }, 
            (payload) => {
              console.log('接收到变更:', payload);
              // 重新加载数据以反映更改
              loadSchedule();
            }
        )
        .subscribe();
      
      console.log('实时订阅已建立');
    } catch (error) {
      console.error('设置实时订阅失败:', error);
    }
  }

  // 更新本地存储
  function updateLocalStorage(tableId, week, day, status, fallbackData) {
    try {
      let scheduleData = fallbackData || [];
      const existingIndex = scheduleData.findIndex(
        d => d.table_id === tableId && d.week === week && d.day === day
      );
      
      if (existingIndex >= 0) {
        scheduleData[existingIndex].status = status;
      } else {
        scheduleData.push({ table_id: tableId, week, day, status });
      }
      
      window.localStorage.setItem('schedule_data', JSON.stringify(scheduleData));
    } catch (error) {
      console.error('更新本地存储失败:', error);
    }
  }

  // 显示通知
  function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${isError ? 'error' : ''} show`;
    
    setTimeout(() => {
      notification.className = 'notification';
    }, 3000);
  }

  // 辅助函数
  function weekStartDate(weekNumber) {
    const daysToAdd = (weekNumber - 1) * 7;
    const d = new Date(SEMESTER_START);
    d.setDate(d.getDate() + daysToAdd);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isAdminPage() {
    return window.location.pathname.includes('admin');
  }

  // 添加一个短暂的延迟，确保 Supabase 客户端完全初始化
  setTimeout(loadSchedule, 100);
});