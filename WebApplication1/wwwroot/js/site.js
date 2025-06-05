
// Большой словарь нутриентов и их русских названий
const nutrientTranslations = {
    "Calcium": "Кальций",
    "Iron": "Железо",
    "Zinc": "Цинк",
    "Vitamin A": "Витамин A",
    "Vitamin C": "Витамин C",
    "Vitamin D": "Витамин D",
    "Vitamin E": "Витамин E",
    "Vitamin K": "Витамин K",
    "Vitamin B6": "Витамин B6",
    "Vitamin B12": "Витамин B12",
    "Thiamin": "Тиамин (B1)",
    "Riboflavin": "Рибофлавин (B2)",
    "Niacin": "Ниацин (B3)",
    "Folate": "Фолат (B9)",
    "Magnesium": "Магний",
    "Phosphorus": "Фосфор",
    "Potassium": "Калий",
    "Sodium": "Натрий",
    "Protein": "Белок",
    "Fiber": "Клетчатка",
    "Carbohydrate": "Углеводы",
    "Sugars": "Сахара",
    "Total Sugars": "Всего сахаров",
    "Fat": "Жиры",
    "Saturated Fat": "Насыщенные жиры"
};

// Продукты, которые были выбраны пользвателем
let selectedFoods = [];

// Сам график, будь он пай-чарт или столбчатый
let nutrientChart = null;

// Доступные нутриенты, исходя из выбранных продуктов, так как в определённых из них может не быть определённого нутриента
let availableNutrients = new Set();

// Фильтры, которые пользователь выбрал
let activeFilters = new Set();

// Текущий вид визуализации графиков, всего два режима, либо bar - для столбчатых графиков, либо pie, для графиков в виде пирога
let currentVisualizationMode = 'bar';


// При вводе больше трёх символов в поиск, выводим пользователю подсказки
document.getElementById('food-search').addEventListener('input', async (e) => 
{
    const query = e.target.value;
    if (query.length < 3) 
        return;

    const response = await fetch(`/Home/SearchFoods?query=${query}`);
    const foods = await response.json();

    const datalist = document.getElementById('food-suggestions');
    datalist.innerHTML = foods.map(food => `<option value="${food.name}">`).join('');
});

// При вводе (Enter) значения, добавляем этот вид продукта в список, если вид продукта существует
document.getElementById('food-search').addEventListener('change', async (e) => 
{
    const foodName = e.target.value;
    if (!foodName) 
        return;

    const response = await fetch(`/Home/SearchFoods?query=${foodName}`);
    const foods = await response.json();

    const selectedFood = foods.find(f => f.name === foodName);
    if (selectedFood && !selectedFoods.some(f => f.id === selectedFood.id)) 
    {
        selectedFoods.push(selectedFood);
        updateSelectedFoodsDisplay();
        updateChart();
    }

    e.target.value = '';
});

// Обновляем визуальное представление продуктов, так как был добавлен новый
function updateSelectedFoodsDisplay() 
{
    const container = document.getElementById('selected-foods');
    container.innerHTML = selectedFoods.map(food => `
        <div class="food-tag" style="background-color: ${food.color.replace('0.7', '0.2')}">
            ${food.name}
            <button onclick="removeFood(${food.id})">×</button>
        </div>
    `).join('');
    
    updateNutrientFilters();
}

// Так как нутриенты это неповторяющийся список (SET), мы проверяем появились ли новые фильтры для нутриентов
function updateNutrientFilters() 
{
    availableNutrients = new Set();
    
    selectedFoods.forEach(food => {
        food.nutrients.forEach(nutrient => {
            availableNutrients.add(nutrient.name);
        });
    });
    
    if (activeFilters.size === 0 && availableNutrients.size > 0)
        availableNutrients.forEach(n => activeFilters.add(n));

    renderFilterCheckboxes();
}

// Так или иначе, обновляем флажочки для каждого нутриента, добавляем для каждого из них прослушивание события изменения
// Дабы добавлять или убирать фильтр и следом обновлять график
function renderFilterCheckboxes() 
{
    const container = document.getElementById('nutrient-checkboxes');
    if (!container) 
        return;

    const sortedNutrients = Array.from(availableNutrients).sort();

    container.innerHTML = sortedNutrients.map(nutrient => `
        <label class="filter-checkbox">
            <input type="checkbox" value="${nutrient}" 
                   ${activeFilters.has(nutrient) ? 'checked' : ''}>
            ${nutrientTranslations[nutrient] || nutrient}
        </label>
    `).join('');
    
    document.querySelectorAll('#nutrient-checkboxes input').forEach(checkbox => 
    {
        checkbox.addEventListener('change', function() 
        {
            if (this.checked)
                activeFilters.add(this.value);
            else
                activeFilters.delete(this.value);
            
            updateChart();
        });
    });
    
    // Кнопка Выбрать все
    document.getElementById('select-all')?.addEventListener('click', () => 
    {
        availableNutrients.forEach(n => activeFilters.add(n));
        renderFilterCheckboxes();
        updateChart();
    });

    // Кнопка Убрать все
    document.getElementById('deselect-all')?.addEventListener('click', () => 
    {
        activeFilters.clear();
        renderFilterCheckboxes();
        updateChart();
    });

    // Поиск по доступным нутриентам
    document.getElementById('filter-search')?.addEventListener('input', function() 
    {
        const searchTerm = this.value.toLowerCase();
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            const label = checkbox.textContent.toLowerCase();
            checkbox.style.display = label.includes(searchTerm) ? 'flex' : 'none';
        });
    });
}

// Если пользователь нажмёт на крестик у еды, она убирается из графиков
function removeFood(id) 
{
    selectedFoods = selectedFoods.filter(food => food.id !== id);
    updateSelectedFoodsDisplay();
    updateChart();
}

// Обновление графика в зависимости от выбранного типа, либо bar, либо pie
// bar - столбчатый, pie - графики в виде пирога
function updateChart() {
    const ctx = document.getElementById('nutrient-chart').getContext('2d');

    if (nutrientChart) 
        nutrientChart.destroy();

    if (selectedFoods.length === 0) 
    {
        document.getElementById('pie-charts-container').innerHTML = '';
        return;
    }

    const nutrients = selectedFoods[0].nutrients.map(n => n.name);
    const filteredNutrients = nutrients.filter(n => activeFilters.has(n));

    if (currentVisualizationMode === 'bar') 
    {
        nutrientChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filteredNutrients.map(n => nutrientTranslations[n] || n),
                datasets: selectedFoods.map(food => ({
                    label: food.name,
                    data: filteredNutrients.map(nutrientName => {
                        const nutrient = food.nutrients.find(n => n.name === nutrientName);
                        return nutrient ? nutrient.amount : 0;
                    }),
                    backgroundColor: food.color,
                    borderColor: food.color.replace('0.7', '1'),
                    borderWidth: 1
                }))
            },
            options: {
                scales: {
                    y: { 
                        beginAtZero: true 
                    }
                },
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        },
                        intersect: false, // Показывать тултип при наведении на область графика
                        mode: 'index'     // Показывать все значения по вертикали
                    }
                }
            }
        });
    }

    // Всегда обновляем pie-чарты, если мы в этом режиме
    if (currentVisualizationMode === 'pie') 
        createPieCharts();
}

// Смена текущего режима визуализации
document.getElementById('toggle-visualization').addEventListener('click', () => 
{
    currentVisualizationMode = 'bar';
    updateVisualization();
});

// Смена текущего режима визуализации
document.getElementById('show-pie-charts').addEventListener('click', () => 
{
    currentVisualizationMode = 'pie';
    updateVisualization();
});

// При смене режима визуализации, убираем старое и создаём новое
function updateVisualization() {
    if (currentVisualizationMode === 'bar') 
    {
        document.getElementById('bar-chart-container').style.display = 'block';
        document.getElementById('pie-charts-container').style.display = 'none';
        updateChart();
    } 
    else 
    {
        document.getElementById('bar-chart-container').style.display = 'none';
        document.getElementById('pie-charts-container').style.display = 'grid';
        createPieCharts();
    }

    // Обновляем активные кнопки
    document.querySelectorAll('.visualization-controls button').forEach(btn => 
    {
        btn.classList.remove('active');
    });
    
    document.querySelector(`.visualization-controls button[${currentVisualizationMode === 'bar' ? 
        'id="toggle-visualization"' : 'id="show-pie-charts"'}]`).classList.add('active');
}

// Создаём графики в виде пирогов
function createPieCharts() 
{
    const container = document.getElementById('pie-charts-container');
    container.innerHTML = '';

    if (selectedFoods.length === 0) 
        return;

    selectedFoods.forEach(food => 
    {
        const filteredNutrients = food.nutrients.filter(n => activeFilters.has(n.name));

        const chartId = `pie-chart-${food.id}`;
        const chartContainer = document.createElement('div');
        chartContainer.className = 'pie-chart-item';
        chartContainer.innerHTML = `
            <h4>${food.name}</h4>
            <div class="pie-chart-wrapper">
                <canvas id="${chartId}"></canvas>
            </div>
        `;
        container.appendChild(chartContainer);

        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: filteredNutrients.map(n => nutrientTranslations[n.name] || n.name),
                datasets: [{
                    data: filteredNutrients.map(n => n.amount),
                    backgroundColor: filteredNutrients.map((_, i) => {
                        const hue = (i * 360 / filteredNutrients.length) % 360;
                        return `hsl(${hue}, 70%, 65%)`;
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const unit = food.nutrients.find(n =>
                                    nutrientTranslations[n.name] === context.label || n.name === context.label
                                )?.unit || '';
                                return `${label}: ${value} ${unit}`;
                            }
                        }
                    }
                }
            }
        });
    });
}