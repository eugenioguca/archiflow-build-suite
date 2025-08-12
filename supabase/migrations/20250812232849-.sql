-- RLS policies for company_promotions
CREATE POLICY "Everyone can view active promotions" ON company_promotions
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promotions" ON company_promotions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for operation_manuals
CREATE POLICY "Employees can view manuals" ON operation_manuals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
  )
);

CREATE POLICY "Admins can manage manuals" ON operation_manuals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for monthly_featured_images
CREATE POLICY "Everyone can view active monthly images" ON monthly_featured_images
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage monthly images" ON monthly_featured_images
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);